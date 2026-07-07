import os
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from api.schemas import RepositoryCloneRequest
from services.repo_service import clone_repository
from services.reader_service import read_file

from utils.security import validate_safe_path

router = APIRouter()


class SaveFileRequest(BaseModel):
    path: str
    content: str


@router.post("/clone")
def clone_repo(payload: RepositoryCloneRequest, project_id: str | None = None):
    from services.redis_service import enqueue_background_job

    path, repo_name, repo_id, needs_backup = clone_repository(
        str(payload.repo_url), project_id=project_id
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

    return {"status": "success", "path": path}


@router.get("/file")
def get_file_content(path: str):
    abs_path = validate_safe_path(path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    content = read_file(abs_path)
    return {"content": content}


@router.post("/save-file")
def save_file_content(payload: SaveFileRequest):
    abs_path = validate_safe_path(payload.path)
    try:
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(payload.content)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
