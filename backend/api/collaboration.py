from fastapi import APIRouter, HTTPException, Query, Depends
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
            "INSERT INTO organizations (id, name) VALUES (?, ?)",
            (org_id, payload.name)
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
            "INSERT INTO projects (id, org_id, repository_id, name) VALUES (?, ?, ?, ?)",
            (project_id, payload.org_id, payload.repository_id, payload.name)
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
        cursor.execute("SELECT * FROM projects WHERE org_id = ?", (org_id,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

# 3. Comments
@router.post("/comments")
def add_comment(payload: CommentCreatePayload, user_id: str = Depends(get_current_user_id)):
    conn = get_db()
    cursor = conn.cursor()
    comment_id = str(uuid.uuid4())
    
    # Resolve user name or fallback to email
    author_name = "Developer"
    try:
        cursor.execute("SELECT name, email FROM users WHERE id = ?", (user_id,))
        user_row = cursor.fetchone()
        if user_row:
            author_name = user_row["name"] or user_row["email"] or "Developer"
    except Exception:
        pass

    try:
        cursor.execute(
            """
            INSERT INTO comments (id, project_id, file, line, comment_text, author)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (comment_id, payload.project_id, payload.file, payload.line, payload.comment_text, author_name)
        )
        conn.commit()
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
                "SELECT * FROM comments WHERE project_id = ? AND file = ? ORDER BY timestamp ASC",
                (project_id, file)
            )
        else:
            cursor.execute(
                "SELECT * FROM comments WHERE project_id = ? ORDER BY timestamp ASC",
                (project_id,)
            )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        conn.commit()
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
            FROM comments WHERE project_id = ?
            ORDER BY timestamp DESC LIMIT 20
            """,
            (project_id,)
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
