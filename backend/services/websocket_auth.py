from services.auth_service import get_user_id_from_token
from services.db_service import get_db
from settings import get_settings

settings = get_settings()


def authenticate_ws_user(token: str | None) -> str | None:
    """Authenticates the WebSocket user via JWT token, falling back to 'mock-dev' for sandbox if allowed."""
    if not token:
        return "mock-dev" if settings.allow_sandbox_login else None

    user_id = get_user_id_from_token(token)
    if user_id:
        return user_id

    return "mock-dev" if settings.allow_sandbox_login else None


def verify_project_membership(user_id: str, project_id: str) -> bool:
    """Verifies if the user is a member of the requested collaboration project."""
    if user_id == "mock-dev" and settings.allow_sandbox_login:
        return True

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM project_members WHERE project_id = %s AND user_id = %s",
            (project_id, user_id),
        )
        row = cursor.fetchone()
        return row is not None
    except Exception as e:
        print(f"[WS Auth] Membership check failed: {e}")
        return False
    finally:
        conn.close()


def verify_project_role(
    user_id: str, project_id: str, allowed_roles: list[str]
) -> bool:
    """Verifies if the user has one of the allowed roles in the requested collaboration project."""
    if user_id == "mock-dev" and settings.allow_sandbox_login:
        return True

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT role FROM project_members WHERE project_id = %s AND user_id = %s",
            (project_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return False
        role = row["role"]
        return role in allowed_roles
    except Exception as e:
        print(f"[WS Auth] Role check failed: {e}")
        return False
    finally:
        conn.close()
