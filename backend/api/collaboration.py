from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Depends,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel
from typing import Optional
import uuid
from services.db_service import get_db
from api.auth import get_current_user_id

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


# 1. Organizations
@router.post("/organizations")
def create_organization(payload: OrgCreatePayload):
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
def list_organizations():
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
def create_project(payload: ProjectCreatePayload):
    conn = get_db()
    cursor = conn.cursor()
    project_id = str(uuid.uuid4())
    try:
        cursor.execute(
            "INSERT INTO projects (id, org_id, repository_id, name) VALUES (%s, %s, %s, %s)",
            (project_id, payload.org_id, payload.repository_id, payload.name),
        )
        conn.commit()
        return {"status": "success", "id": project_id, "name": payload.name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.get("/projects")
def list_projects(org_id: str = Query(...)):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM projects WHERE org_id = %s", (org_id,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# 3. Comments
@router.post("/comments")
def add_comment(
    payload: CommentCreatePayload, user_id: str = Depends(get_current_user_id)
):
    conn = get_db()
    cursor = conn.cursor()
    comment_id = str(uuid.uuid4())

    # Resolve user name or fallback to email
    author_name = "Developer"
    try:
        cursor.execute("SELECT name, email FROM users WHERE id = %s", (user_id,))
        user_row = cursor.fetchone()
        if user_row:
            author_name = user_row["name"] or user_row["email"] or "Developer"
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

        return {"status": "success", "id": comment_id, "author": author_name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.get("/comments")
def get_comments(project_id: str = Query(...), file: Optional[str] = Query(None)):
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
def delete_comment(comment_id: str):
    conn = get_db()
    cursor = conn.cursor()

    # Get project_id to broadcast deletion
    project_id = None
    try:
        cursor.execute("SELECT project_id FROM comments WHERE id = %s", (comment_id,))
        row = cursor.fetchone()
        if row:
            project_id = row["project_id"]
    except Exception:
        pass

    try:
        cursor.execute("DELETE FROM comments WHERE id = %s", (comment_id,))
        conn.commit()

        # Publish to event bus
        if project_id:
            try:
                from services.event_bus import publish_comment_deleted

                publish_comment_deleted(project_id, comment_id)
            except Exception as err:
                print(f"[API Collaboration] Event bus publish fail: {err}")

        return {"status": "success", "message": "Comment deleted."}
    finally:
        conn.close()


# 4. Activity Feed
@router.get("/activity")
def get_activity_feed(project_id: str = Query(...)):
    """Compiles recent project collaboration feed logs (such as comments and updates)."""
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


# 5. Real-time Event Streaming
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
