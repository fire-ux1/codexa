import os
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends

from api.schemas import RepositoryCloneRequest
from services.repo_service import clone_repository
from services.reader_service import read_file
from services.redis_service import enqueue_background_job
from services.audit_service import log_audit_event
from api.auth import get_current_user_id
from services.websocket_auth import verify_project_role
from services.auth_validation import verify_file_access
from utils.security import validate_safe_path

router = APIRouter()


class SaveFileRequest(BaseModel):
    path: str
    content: str


@router.post("/clone")
def clone_repo(
    payload: RepositoryCloneRequest,
    project_id: str | None = None,
    user_id: str = Depends(get_current_user_id),
):
    # If linked to a project, user must have write role in the project
    if project_id:
        if not verify_project_role(user_id, project_id, ["owner", "admin", "member"]):
            raise HTTPException(
                status_code=403,
                detail="Access Denied: You do not have permission to clone a repository into this project.",
            )

    path, repo_name, repo_id, needs_backup = clone_repository(
        str(payload.repo_url),
        user_id=user_id,
        project_id=project_id,
        access_token=payload.access_token,
    )

    if needs_backup:
        enqueue_background_job(
            "archive_and_upload",
            {
                "path": path,
                "repo_name": repo_name,
                "repo_url": str(payload.repo_url),
                "repo_id": repo_id,
            },
        )

    log_audit_event(
        user_id=user_id,
        action="clone_repository",
        project_id=project_id,
        details={"url": str(payload.repo_url), "path": path},
    )

    return {"status": "success", "path": path}


@router.get("/file")
def get_file_content(path: str, user_id: str = Depends(get_current_user_id)):
    # 1. Enforce file bounds and user access
    verify_file_access(path, user_id, write=False)

    abs_path = validate_safe_path(path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    content = read_file(abs_path)
    return {"content": content}


@router.post("/save-file")
def save_file_content(
    payload: SaveFileRequest, user_id: str = Depends(get_current_user_id)
):
    # 1. Enforce file bounds and write access
    verify_file_access(payload.path, user_id, write=True)

    abs_path = validate_safe_path(payload.path)
    try:
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(payload.content)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
