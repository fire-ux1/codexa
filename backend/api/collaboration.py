from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Depends,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel
from typing import Optional, List
import uuid
from services.db_service import get_db, get_user
from api.auth import get_current_user_id
from services.auth_validation import verify_repo_write_access
from services.audit_service import log_audit_event

router = APIRouter()


class OrgCreatePayload(BaseModel):
    name: str


class ProjectCreatePayload(BaseModel):
    org_id: str
    repository_id: str
    name: str


class CommentCreatePayload(BaseModel):
    project_id: str
    file: str
    line: int
    comment_text: str


class MemberPayload(BaseModel):
    user_id: str
    role: str


class RoleUpdatePayload(BaseModel):
    role: str


# 1. Organizations
@router.post("/organizations")
def create_organization(
    payload: OrgCreatePayload, user_id: str = Depends(get_current_user_id)
):
    conn = get_db()
    cursor = conn.cursor()
    org_id = str(uuid.uuid4())
    try:
        cursor.execute(
            "INSERT INTO organizations (id, name) VALUES (%s, %s)",
            (org_id, payload.name),
        )
        conn.commit()
        return {"status": "success", "id": org_id, "name": payload.name}
    finally:
        conn.close()


@router.get("/organizations")
def list_organizations(user_id: str = Depends(get_current_user_id)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM organizations")
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# 2. Projects
@router.post("/projects")
def create_project(
    payload: ProjectCreatePayload, user_id: str = Depends(get_current_user_id)
):
    # 1. Verify that the user has write access to the repository they are trying to link
    verify_repo_write_access(payload.repository_id, user_id)

    conn = get_db()
    cursor = conn.cursor()
    project_id = str(uuid.uuid4())
    try:
        cursor.execute(
            "INSERT INTO projects (id, org_id, repository_id, name) VALUES (%s, %s, %s, %s)",
            (project_id, payload.org_id, payload.repository_id, payload.name),
        )
        # Automatically add the creator as the Owner of the project
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            (project_id, user_id, "owner"),
        )
        conn.commit()
        return {"status": "success", "id": project_id, "name": payload.name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.get("/projects")
def list_projects(
    org_id: str = Query(...), user_id: str = Depends(get_current_user_id)
):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # User must be a member of the project or the repository owner to view projects in this organization
        # For simplicity, list all projects where the user is a member or repository owner
        cursor.execute(
            """
            SELECT p.* FROM projects p
            LEFT JOIN project_members pm ON p.id = pm.project_id
            LEFT JOIN repositories r ON p.repository_id = r.id
            WHERE p.org_id = %s AND (pm.user_id = %s OR r.user_id = %s)
            GROUP BY p.id
            """,
            (org_id, user_id, user_id),
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# 3. Comments
@router.post("/comments")
def add_comment(
    payload: CommentCreatePayload, user_id: str = Depends(get_current_user_id)
):
    from services.websocket_auth import verify_project_role

    # Enforce write access (only owner, admin, or member can comment)
    if not verify_project_role(
        user_id, payload.project_id, ["owner", "admin", "member"]
    ):
        raise HTTPException(
            status_code=403,
            detail="Access Denied: You do not have permissions to comment on this project.",
        )

    conn = get_db()
    cursor = conn.cursor()
    comment_id = str(uuid.uuid4())

    # Resolve user name or fallback to email
    author_name = "Developer"
    user_email = ""
    try:
        cursor.execute("SELECT name, email FROM users WHERE id = %s", (user_id,))
        user_row = cursor.fetchone()
        if user_row:
            author_name = user_row["name"] or user_row["email"] or "Developer"
            user_email = user_row["email"] or ""
    except Exception:
        pass

    try:
        cursor.execute(
            """
            INSERT INTO comments (id, project_id, file, line, comment_text, author)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                comment_id,
                payload.project_id,
                payload.file,
                payload.line,
                payload.comment_text,
                author_name,
            ),
        )
        conn.commit()

        # Publish to event bus
        try:
            from services.event_bus import publish_comment_added

            comment_data = {
                "id": comment_id,
                "project_id": payload.project_id,
                "file": payload.file,
                "line": payload.line,
                "comment_text": payload.comment_text,
                "author": author_name,
            }
            publish_comment_added(payload.project_id, comment_data)
        except Exception as err:
            print(f"[API Collaboration] Event bus publish fail: {err}")

        log_audit_event(
            user_id=user_id,
            action="add_comment",
            project_id=payload.project_id,
            details={"file": payload.file, "line": payload.line},
        )

        return {"status": "success", "id": comment_id, "author": author_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.get("/comments")
def get_comments(
    project_id: str = Query(...),
    file: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user_id),
):
    from services.websocket_auth import verify_project_membership

    # Enforce read access (must be a member of the project)
    if not verify_project_membership(user_id, project_id):
        raise HTTPException(
            status_code=403,
            detail="Access Denied: You are not a member of this project.",
        )

    conn = get_db()
    cursor = conn.cursor()
    try:
        if file:
            cursor.execute(
                "SELECT * FROM comments WHERE project_id = %s AND file = %s ORDER BY timestamp ASC",
                (project_id, file),
            )
        else:
            cursor.execute(
                "SELECT * FROM comments WHERE project_id = %s ORDER BY timestamp ASC",
                (project_id,),
            )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str, user_id: str = Depends(get_current_user_id)):
    from services.websocket_auth import verify_project_role

    conn = get_db()
    cursor = conn.cursor()

    # Get comment details to check ownership
    cursor.execute(
        "SELECT project_id, author FROM comments WHERE id = %s", (comment_id,)
    )
    comment = cursor.fetchone()
    if not comment:
        conn.close()
        raise HTTPException(status_code=404, detail="Comment not found.")

    project_id = comment["project_id"]
    author = comment["author"]

    # Retrieve current user info for matching name/email
    cursor.execute("SELECT name, email FROM users WHERE id = %s", (user_id,))
    user_row = cursor.fetchone()
    is_author = False
    if user_row:
        is_author = author == user_row["name"] or author == user_row["email"]

    # Check if user is project admin or owner
    is_admin_or_owner = verify_project_role(user_id, project_id, ["owner", "admin"])

    if not (is_author or is_admin_or_owner):
        conn.close()
        raise HTTPException(
            status_code=403,
            detail="Access Denied: You cannot delete this comment.",
        )

    try:
        cursor.execute("DELETE FROM comments WHERE id = %s", (comment_id,))
        conn.commit()

        # Publish to event bus
        try:
            from services.event_bus import publish_comment_deleted

            publish_comment_deleted(project_id, comment_id)
        except Exception as err:
            print(f"[API Collaboration] Event bus publish fail: {err}")

        log_audit_event(
            user_id=user_id,
            action="delete_comment",
            project_id=project_id,
            details={"comment_id": comment_id},
        )

        return {"status": "success", "message": "Comment deleted."}
    finally:
        conn.close()


# 4. Activity Feed
@router.get("/activity")
def get_activity_feed(
    project_id: str = Query(...), user_id: str = Depends(get_current_user_id)
):
    from services.websocket_auth import verify_project_membership

    if not verify_project_membership(user_id, project_id):
        raise HTTPException(
            status_code=403,
            detail="Access Denied: You are not a member of this project.",
        )

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT 'comment' as type, author, file as path, timestamp, comment_text as message
            FROM comments WHERE project_id = %s
            ORDER BY timestamp DESC LIMIT 20
            """,
            (project_id,),
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# 5. Project Members Management
@router.post("/projects/{project_id}/members")
def add_project_member(
    project_id: str,
    payload: MemberPayload,
    current_user_id: str = Depends(get_current_user_id),
):
    from services.websocket_auth import verify_project_role

    if not verify_project_role(current_user_id, project_id, ["owner", "admin"]):
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Only project owners or admins can add members.",
        )

    if payload.role not in ["owner", "admin", "member", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE id = %s", (payload.user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found.")

        # Check if already member
        cursor.execute(
            "SELECT role FROM project_members WHERE project_id = %s AND user_id = %s",
            (project_id, payload.user_id),
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=400, detail="User is already a member of this project."
            )

        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            (project_id, payload.user_id, payload.role),
        )
        conn.commit()

        log_audit_event(
            user_id=current_user_id,
            action="add_member",
            project_id=project_id,
            details={"target_user": payload.user_id, "role": payload.role},
        )

        return {
            "status": "success",
            "message": f"User {payload.user_id} added as {payload.role}.",
        }
    finally:
        conn.close()


@router.delete("/projects/{project_id}/members/{user_id}")
def remove_project_member(
    project_id: str,
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    from services.websocket_auth import verify_project_role

    is_self = current_user_id == user_id
    is_authorized = verify_project_role(current_user_id, project_id, ["owner", "admin"])

    if not (is_self or is_authorized):
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Insufficient permissions to remove member.",
        )

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT role FROM project_members WHERE project_id = %s AND user_id = %s",
            (project_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Member not found.")

        target_role = row["role"]
        if target_role == "owner" and not is_self:
            # Check if current user is owner
            cursor.execute(
                "SELECT role FROM project_members WHERE project_id = %s AND user_id = %s",
                (project_id, current_user_id),
            )
            curr_row = cursor.fetchone()
            if not curr_row or curr_row["role"] != "owner":
                raise HTTPException(
                    status_code=403,
                    detail="Access Denied: Only project owners can remove the owner.",
                )

        cursor.execute(
            "DELETE FROM project_members WHERE project_id = %s AND user_id = %s",
            (project_id, user_id),
        )
        conn.commit()

        log_audit_event(
            user_id=current_user_id,
            action="remove_member",
            project_id=project_id,
            details={"target_user": user_id},
        )

        return {"status": "success", "message": "Member removed successfully."}
    finally:
        conn.close()


@router.patch("/projects/{project_id}/members/{user_id}")
def update_project_member_role(
    project_id: str,
    user_id: str,
    payload: RoleUpdatePayload,
    current_user_id: str = Depends(get_current_user_id),
):
    from services.websocket_auth import verify_project_role

    if not verify_project_role(current_user_id, project_id, ["owner", "admin"]):
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Only project owners or admins can update roles.",
        )

    if payload.role not in ["owner", "admin", "member", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT role FROM project_members WHERE project_id = %s AND user_id = %s",
            (project_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Member not found.")

        if row["role"] == "owner" and user_id != current_user_id:
            raise HTTPException(
                status_code=403,
                detail="Access Denied: Only the owner can transfer or modify ownership.",
            )

        cursor.execute(
            "UPDATE project_members SET role = %s WHERE project_id = %s AND user_id = %s",
            (payload.role, project_id, user_id),
        )
        conn.commit()

        log_audit_event(
            user_id=current_user_id,
            action="update_role",
            project_id=project_id,
            details={"target_user": user_id, "role": payload.role},
        )

        return {"status": "success", "message": f"Role updated to {payload.role}."}
    finally:
        conn.close()


# 6. Real-time Event Streaming
@router.websocket("/events")
async def websocket_collaboration(
    websocket: WebSocket,
    project_id: str = Query(...),
    token: Optional[str] = Query(None),
):
    from services.websocket_auth import (
        authenticate_ws_user,
        verify_project_membership,
    )

    user_id = authenticate_ws_user(token)

    if not user_id or not verify_project_membership(user_id, project_id):
        await websocket.accept()
        await websocket.send_json({"error": "Unauthorized connection."})
        await websocket.close(code=4003)
        return

    from services.websocket_manager import manager

    await manager.connect(websocket, project_id)

    try:
        import json
        from settings import get_settings

        max_size = get_settings().max_ws_message_size

        while True:
            # Receive and monitor messages from client
            event = await websocket.receive()
            if event.get("type") == "websocket.disconnect":
                break

            # Message Size Protection check
            text = event.get("text", "")
            bytes_data = event.get("bytes", b"")
            msg_len = len(text) if text else len(bytes_data)

            if msg_len > max_size:
                print(f"[WS Collaboration] Oversized payload rejected: {msg_len} bytes")
                await websocket.send_json({"error": "Payload size limit exceeded."})
                await websocket.close(code=4009)
                break

            data = {}
            if text:
                try:
                    data = json.loads(text)
                except Exception:
                    pass

            if data.get("type") == "pong":
                manager.record_pong(websocket)
            else:
                manager.record_user_activity(websocket)

            # Accept future presence/typing commands
            if data.get("type") == "typing_started":
                await manager.broadcast_to_project(
                    {
                        "type": "typing_started",
                        "project_id": project_id,
                        "payload": {"user": user_id},
                    },
                    project_id,
                )
            elif data.get("type") == "typing_stopped":
                await manager.broadcast_to_project(
                    {
                        "type": "typing_stopped",
                        "project_id": project_id,
                        "payload": {"user": user_id},
                    },
                    project_id,
                )

    except WebSocketDisconnect:
        print(f"[WS Collaboration] Client disconnected from project {project_id}")
    finally:
        await manager.disconnect(websocket, project_id)
