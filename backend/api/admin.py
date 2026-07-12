from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional

from settings import get_settings
from api.auth import get_current_user_id
from services.db_service import get_db
from services.auth_validation import verify_repo_access

router = APIRouter()
settings = get_settings()


class UpdateRolePayload(BaseModel):
    repository_id: str
    project_id: str
    user_id: str
    role: str  # owner, admin, member, viewer


def verify_admin_access(repo_id_or_path: str, user_id: str) -> dict:
    """Helper to verify that the user has admin/owner status on the repository or linked project."""
    repo = verify_repo_access(repo_id_or_path, user_id)
    if not settings.enforce_strict_auth:
        return repo

    if repo["user_id"] == user_id:
        return repo

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT pm.role FROM project_members pm
            JOIN projects p ON pm.project_id = p.id
            WHERE p.repository_id = %s AND pm.user_id = %s
            """,
            (repo["id"], user_id),
        )
        rows = cursor.fetchall()
        roles = [row["role"] for row in rows]
        if any(role in ["owner", "admin"] for role in roles):
            return repo

        raise HTTPException(
            status_code=403,
            detail="Access Denied: Administrative privileges required.",
        )
    finally:
        conn.close()


@router.get("/members")
def get_project_members(
    repository_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """Retrieves all project members and their roles for projects linked to the repository."""
    # Verify the current user is an admin/owner
    repo = verify_admin_access(repository_id, current_user_id)

    conn = get_db()
    cursor = conn.cursor()
    try:
        if not settings.enforce_strict_auth:
            # Sandbox mode: return all users in DB with mock roles/projects so the admin UI works
            cursor.execute("SELECT id, email, name, avatar_url FROM users")
            users = cursor.fetchall()

            # Retrieve any existing projects
            cursor.execute("SELECT id, name FROM projects LIMIT 1")
            proj_row = cursor.fetchone()
            project_id = proj_row["id"] if proj_row else "sandbox-project"
            project_name = proj_row["name"] if proj_row else "Sandbox Project"

            members = []
            for u in users:
                # Mock a role for each user
                mock_role = "viewer"
                if u["id"] == current_user_id:
                    mock_role = "owner"
                elif u["id"] == "mock-dev":
                    mock_role = "admin"
                elif "admin" in u["email"]:
                    mock_role = "admin"
                elif "member" in u["email"]:
                    mock_role = "member"

                members.append(
                    {
                        "project_id": project_id,
                        "project_name": project_name,
                        "user_id": u["id"],
                        "email": u["email"],
                        "name": u["name"],
                        "avatar_url": u["avatar_url"],
                        "role": mock_role,
                    }
                )
            return members

        # Strict mode: query members from database
        cursor.execute(
            """
            SELECT DISTINCT p.id as project_id, p.name as project_name, 
                   u.id as user_id, u.email, u.name, u.avatar_url, pm.role
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            JOIN projects p ON pm.project_id = p.id
            WHERE p.repository_id = %s
            """,
            (repo["id"],),
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.put("/members/role")
def update_project_member_role(
    payload: UpdateRolePayload,
    current_user_id: str = Depends(get_current_user_id),
):
    """Updates a user's role inside a project linked to the repository."""
    # Verify the current user is an admin/owner
    verify_admin_access(payload.repository_id, current_user_id)

    if payload.role not in ["owner", "admin", "member", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check if the project is actually linked to this repository
        if settings.enforce_strict_auth:
            cursor.execute(
                "SELECT 1 FROM projects WHERE id = %s AND repository_id = %s",
                (payload.project_id, payload.repository_id),
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Project not associated with this repository.",
                )

        # Update role (or insert/upsert in sandbox mode)
        cursor.execute(
            "SELECT 1 FROM project_members WHERE project_id = %s AND user_id = %s",
            (payload.project_id, payload.user_id),
        )
        exists = cursor.fetchone()
        if exists:
            cursor.execute(
                "UPDATE project_members SET role = %s WHERE project_id = %s AND user_id = %s",
                (payload.role, payload.project_id, payload.user_id),
            )
        else:
            # If membership doesn't exist (e.g. sandbox mock members), insert it
            cursor.execute(
                "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
                (payload.project_id, payload.user_id, payload.role),
            )
        conn.commit()
        return {
            "status": "success",
            "message": f"Successfully updated user role to {payload.role}.",
        }
    finally:
        conn.close()


@router.get("/audit-logs")
def get_project_audit_logs(
    repository_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user_id),
):
    """Retrieves operational and compliance audit logs associated with the repository's projects."""
    # Verify the current user is an admin/owner
    repo = verify_admin_access(repository_id, current_user_id)

    conn = get_db()
    cursor = conn.cursor()
    try:
        # Construct filters
        query_params = []

        if not settings.enforce_strict_auth:
            # Sandbox mode: retrieve all logs
            sql = """
                SELECT al.id, al.user_id, u.name as user_name, u.email as user_email, 
                       al.action, al.project_id, al.details, al.ip_address, al.timestamp as created_at
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
            """
            where_clauses = []
        else:
            # Strict mode: retrieve logs for projects linked to the repository
            sql = """
                SELECT al.id, al.user_id, u.name as user_name, u.email as user_email, 
                       al.action, al.project_id, al.details, al.ip_address, al.timestamp as created_at
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.project_id IN (SELECT id FROM projects WHERE repository_id = %s)
            """
            query_params.append(repo["id"])
            where_clauses = []

        if search:
            # Support fuzzy search over action or user name/email or details
            search_pattern = f"%{search}%"
            where_clauses.append(
                "(al.action LIKE %s OR u.name LIKE %s OR u.email LIKE %s OR al.details LIKE %s)"
            )
            query_params.extend(
                [search_pattern, search_pattern, search_pattern, search_pattern]
            )

        if where_clauses:
            if not settings.enforce_strict_auth:
                sql += " WHERE " + " AND ".join(where_clauses)
            else:
                sql += " AND " + " AND ".join(where_clauses)

        # Order and pagination
        sql += " ORDER BY al.timestamp DESC LIMIT %s OFFSET %s"
        query_params.extend([limit, offset])

        cursor.execute(sql, tuple(query_params))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
