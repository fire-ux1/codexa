import json
import uuid
from services.db_service import get_db


def log_audit_event(
    user_id: str,
    action: str,
    project_id: str = None,
    details: dict = None,
    ip_address: str = None,
) -> bool:
    """Inserts a structured operational/security log event into the audit_logs table."""
    conn = get_db()
    cursor = conn.cursor()
    log_id = str(uuid.uuid4())
    details_str = json.dumps(details) if details else "{}"
    try:
        cursor.execute(
            """
            INSERT INTO audit_logs (id, user_id, action, project_id, details, ip_address)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (log_id, user_id, action, project_id, details_str, ip_address),
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"[Audit Service] Failed to log event '{action}': {e}")
        return False
    finally:
        conn.close()
