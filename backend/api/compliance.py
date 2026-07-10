from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.auth import get_current_user_id
from services.db_service import get_db

router = APIRouter()


class ComplianceSettingsPayload(BaseModel):
    hipaa_mode: bool
    sox_mode: bool
    retention_days: int
    session_timeout: bool
    slack_enabled: bool
    jira_enabled: bool
    github_ent_enabled: bool


@router.get("/settings")
def get_compliance_settings(current_user_id: str = Depends(get_current_user_id)):
    """Retrieves the global compliance and third-party integration settings."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM compliance_settings WHERE id = 'default'")
        row = cursor.fetchone()
        if not row:
            # Fallback default dict
            return {
                "hipaa_mode": False,
                "sox_mode": False,
                "retention_days": 90,
                "session_timeout": True,
                "slack_enabled": False,
                "jira_enabled": False,
                "github_ent_enabled": False,
            }
        return dict(row)
    finally:
        conn.close()


@router.put("/settings")
def update_compliance_settings(
    payload: ComplianceSettingsPayload,
    current_user_id: str = Depends(get_current_user_id),
):
    """Updates the global compliance settings. Restricted to authenticated users."""
    # Note: In production, we would verify project membership or owner/admin roles.
    # For Sandbox/Developer convenience, we allow the authenticated user to save.
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO compliance_settings (id, hipaa_mode, sox_mode, retention_days, session_timeout, 
                                             slack_enabled, jira_enabled, github_ent_enabled)
            VALUES ('default', %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT(id) DO UPDATE SET
                hipaa_mode = EXCLUDED.hipaa_mode,
                sox_mode = EXCLUDED.sox_mode,
                retention_days = EXCLUDED.retention_days,
                session_timeout = EXCLUDED.session_timeout,
                slack_enabled = EXCLUDED.slack_enabled,
                jira_enabled = EXCLUDED.jira_enabled,
                github_ent_enabled = EXCLUDED.github_ent_enabled
            """,
            (
                payload.hipaa_mode,
                payload.sox_mode,
                payload.retention_days,
                payload.session_timeout,
                payload.slack_enabled,
                payload.jira_enabled,
                payload.github_ent_enabled,
            ),
        )
        conn.commit()

        # Log to audit service
        from services.audit_service import log_audit_event

        log_audit_event(
            current_user_id,
            "update_compliance_settings",
            details={
                "hipaa": payload.hipaa_mode,
                "sox": payload.sox_mode,
                "retention": payload.retention_days,
            },
        )

        return {
            "status": "success",
            "message": "Compliance policies updated successfully.",
        }
    finally:
        conn.close()
