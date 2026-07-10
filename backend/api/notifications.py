from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
import uuid

from api.auth import get_current_user_id
from services.db_service import get_db

router = APIRouter()


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    read: bool
    type: str
    created_at: str


@router.get("", response_model=List[NotificationResponse])
def list_notifications(current_user_id: str = Depends(get_current_user_id)):
    """Retrieves all notifications for the user, mock-seeding defaults if database is empty."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check if notifications exist
        cursor.execute(
            "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC",
            (current_user_id,),
        )
        rows = cursor.fetchall()

        if not rows:
            # Seed 2 premium mock notifications
            mock_id1 = str(uuid.uuid4())
            mock_id2 = str(uuid.uuid4())

            cursor.execute(
                """
                INSERT INTO notifications (id, user_id, title, message, read, type)
                VALUES (%s, %s, %s, %s, FALSE, 'system'),
                       (%s, %s, %s, %s, FALSE, 'index')
                """,
                (
                    mock_id1,
                    current_user_id,
                    "Welcome to CodePilot AI!",
                    "Scan code, analyze system architectures, and configure policies in real-time.",
                    mock_id2,
                    current_user_id,
                    "Repository Indexed",
                    "Fuzzy index files mapped successfully for advanced intelligence query.",
                ),
            )
            conn.commit()

            # Fetch again
            cursor.execute(
                "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC",
                (current_user_id,),
            )
            rows = cursor.fetchall()

        # Format datetime objects to strings
        formatted_rows = []
        for r in rows:
            d = dict(r)
            # Ensure created_at is returned as ISO format string
            if hasattr(d["created_at"], "isoformat"):
                d["created_at"] = d["created_at"].isoformat() + "Z"
            else:
                d["created_at"] = str(d["created_at"])
            formatted_rows.append(d)

        return formatted_rows
    finally:
        conn.close()


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """Marks a specific notification as read."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT user_id FROM notifications WHERE id = %s", (notification_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Notification not found.")

        if row["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Access Denied.")

        cursor.execute(
            "UPDATE notifications SET read = TRUE WHERE id = %s",
            (notification_id,),
        )
        conn.commit()
        return {"status": "success", "message": "Notification marked as read."}
    finally:
        conn.close()


@router.post("/read-all")
def mark_all_notifications_read(current_user_id: str = Depends(get_current_user_id)):
    """Marks all notifications as read for the user."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE notifications SET read = TRUE WHERE user_id = %s",
            (current_user_id,),
        )
        conn.commit()
        return {"status": "success", "message": "All notifications marked as read."}
    finally:
        conn.close()
