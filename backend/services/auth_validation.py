from fastapi import HTTPException, Request, Depends
from services.db_service import get_db
from settings import get_settings
import os
from api.auth import get_current_user_id

settings = get_settings()


def get_repository_by_path_or_id(repo_id_or_path: str) -> dict | None:
    """Helper to retrieve a repository record from DB by ID or path."""
    if not repo_id_or_path:
        return None

    conn = get_db()
    cursor = conn.cursor()
    try:
        # 1. Try by ID
        cursor.execute("SELECT * FROM repositories WHERE id = %s", (repo_id_or_path,))
        row = cursor.fetchone()
        if row:
            return dict(row)

        # 2. Try by exact path
        cursor.execute(
            "SELECT * FROM repositories WHERE repository_path = %s", (repo_id_or_path,)
        )
        row = cursor.fetchone()
        if row:
            return dict(row)

        # 3. Try by normalized paths (e.g. resolve absolute path or strip slashes)
        normalized_path = os.path.abspath(repo_id_or_path)
        cursor.execute("SELECT * FROM repositories")
        rows = cursor.fetchall()
        for r in rows:
            if os.path.abspath(r["repository_path"]) == normalized_path:
                return dict(r)

        return None
    except Exception as e:
        print(f"[Auth Validation] DB query error: {e}")
        return None
    finally:
        conn.close()


def _get_user_roles_in_repo_projects(repo_id: str, user_id: str) -> list[str]:
    """Retrieves all roles a user has in any projects linked to the given repository."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT pm.role FROM project_members pm
            JOIN projects p ON pm.project_id = p.id
            WHERE p.repository_id = %s AND pm.user_id = %s
            """,
            (repo_id, user_id),
        )
        rows = cursor.fetchall()
        return [row["role"] for row in rows]
    except Exception as e:
        print(f"[Auth Validation] DB query error in _get_user_roles_in_repo_projects: {e}")
        return []
    finally:
        conn.close()


def verify_repo_access(repo_id_or_path: str, user_id: str) -> dict:
    """
    Validates if the user has access to the given repository.
    Returns the repository record.
    Raises HTTPException (403 Forbidden or 404 Not Found) if access is denied.
    """
    if not settings.enforce_strict_auth:
        # If strict auth is globally disabled, try to return repo if exists, or return dummy
        repo = get_repository_by_path_or_id(repo_id_or_path)
        return repo or {
            "id": "sandbox",
            "user_id": user_id,
            "repository_path": repo_id_or_path,
        }

    repo = get_repository_by_path_or_id(repo_id_or_path)
    if not repo:
        raise HTTPException(
            status_code=404,
            detail="Repository not found in database. Please clone or index it first.",
        )

    # 1. Owner access
    if repo["user_id"] == user_id:
        return repo

    # 2. Project membership access (using optimized single JOIN query instead of N+1)
    roles = _get_user_roles_in_repo_projects(repo["id"], user_id)
    if roles:
        return repo

    # Neither owner nor project member
    raise HTTPException(
        status_code=403,
        detail="Access Denied: You do not have permission to access this repository.",
    )


def verify_repo_write_access(repo_id_or_path: str, user_id: str) -> dict:
    """
    Validates if the user has write access to the given repository.
    Owners always have write access. Project members must have a role other than 'viewer'.
    """
    repo = verify_repo_access(repo_id_or_path, user_id)
    if repo["user_id"] == user_id:
        return repo

    # If the user accessed via project membership, verify role is write-capable
    roles = _get_user_roles_in_repo_projects(repo["id"], user_id)
    if any(role in ["owner", "admin", "member"] for role in roles):
        return repo

    raise HTTPException(
        status_code=403,
        detail="Access Denied: You have read-only (viewer) access to this project.",
    )


def get_authorized_repositories_for_user(user_id: str) -> list:
    """Returns all repositories owned by the user OR linked to a project they belong to."""
    if not settings.enforce_strict_auth:
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM repositories ORDER BY last_accessed DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT DISTINCT r.* FROM repositories r
            LEFT JOIN projects p ON r.id = p.repository_id
            LEFT JOIN project_members pm ON p.id = pm.project_id
            WHERE r.user_id = %s OR pm.user_id = %s
            ORDER BY r.last_accessed DESC
            """,
            (user_id, user_id),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except Exception as e:
        print(f"[Auth Validation] get_authorized_repositories error: {e}")
        return []
    finally:
        conn.close()


def get_repo_for_file_path(file_path: str) -> str | None:
    """Finds the repository ID containing the given file path by matching paths, checking the most specific first."""
    abs_file = os.path.abspath(file_path)
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, repository_path FROM repositories")
        repos = cursor.fetchall()
        # Sort repos by path length descending so most specific matching path is checked first
        sorted_repos = sorted(
            repos,
            key=lambda x: len(os.path.abspath(x["repository_path"])),
            reverse=True,
        )
        for r in sorted_repos:
            repo_abs = os.path.abspath(r["repository_path"]) + os.sep
            if abs_file.startswith(repo_abs) or abs_file == os.path.abspath(
                r["repository_path"]
            ):
                return r["id"]
        return None
    except Exception as e:
        print(f"[Auth Validation] file path resolve error: {e}")
        return None
    finally:
        conn.close()


def verify_file_access(file_path: str, user_id: str, write: bool = False) -> str | None:
    """
    Verifies that the user has read/write permission to the repository containing the file.
    If no repository is associated, permits access if it lies in the workspace and user is authenticated.
    """
    # 1. First find if there's an associated repository
    repo_id = get_repo_for_file_path(file_path)
    if repo_id:
        if write:
            verify_repo_write_access(repo_id, user_id)
        else:
            verify_repo_access(repo_id, user_id)
        return repo_id

    # 2. Otherwise, check directory bounds
    from utils.security import validate_safe_path

    validate_safe_path(file_path)
    return None


async def _extract_repo_id_or_path(request: Request) -> str:
    """Helper to extract repository identifier or path from query, path, or JSON body params."""
    repo_id_or_path = (
        request.query_params.get("repo_id")
        or request.query_params.get("repo_path")
        or request.query_params.get("repo")
    )

    if not repo_id_or_path:
        repo_id_or_path = (
            request.path_params.get("repo_id")
            or request.path_params.get("repo_path")
            or request.path_params.get("repo")
        )

    if not repo_id_or_path:
        try:
            body = await request.json()
            if isinstance(body, dict):
                repo_id_or_path = (
                    body.get("repo_id")
                    or body.get("repo_path")
                    or body.get("repo")
                    or body.get("repository_id")
                )
        except Exception:
            pass

    if not repo_id_or_path:
        raise HTTPException(
            status_code=400,
            detail="Missing repository path or identifier (repo_id, repo_path, or repo).",
        )

    return repo_id_or_path


async def require_repo_read(
    request: Request, user_id: str = Depends(get_current_user_id)
) -> dict:
    """FastAPI dependency to enforce repository read permissions on the request."""
    repo_id_or_path = await _extract_repo_id_or_path(request)
    return verify_repo_access(repo_id_or_path, user_id)


async def require_repo_write(
    request: Request, user_id: str = Depends(get_current_user_id)
) -> dict:
    """FastAPI dependency to enforce repository write permissions on the request."""
    repo_id_or_path = await _extract_repo_id_or_path(request)
    return verify_repo_write_access(repo_id_or_path, user_id)
