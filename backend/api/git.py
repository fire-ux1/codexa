from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional

from api.auth import get_current_user_id
from services.auth_validation import verify_repo_access
from services.git_service import (
    get_repo_status,
    get_commit_history,
    get_git_diff,
    git_blame,
    generate_commit_msg,
    explain_commit,
    review_pull_request,
)

router = APIRouter()


class DiffPayload(BaseModel):
    repo: str
    target: Optional[str] = None
    source: Optional[str] = None


class ReviewPayload(BaseModel):
    repo: str
    source: str
    target: str


class CommitMessagePayload(BaseModel):
    repo: str


@router.get("/status")
def git_status(
    repo: str = Query(..., description="Absolute path to repository on disk"),
    user_id: str = Depends(get_current_user_id),
):
    """Returns local git status, staged, unstaged and untracked files."""
    verify_repo_access(repo, user_id)
    res = get_repo_status(repo)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@router.get("/history")
def git_history(
    repo: str = Query(..., description="Absolute path to repository"),
    file: Optional[str] = Query(
        None, description="Optional relative or absolute file path to filter history"
    ),
    max_count: int = Query(20, description="Max commits to return"),
    user_id: str = Depends(get_current_user_id),
):
    """Retrieves commit history list, optionally filtered by file path."""
    verify_repo_access(repo, user_id)
    res = get_commit_history(repo, file_path=file, max_count=max_count)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@router.post("/diff")
def git_diff(payload: DiffPayload, user_id: str = Depends(get_current_user_id)):
    """Retrieves a unified git diff between commits/branches or staged/unstaged changes."""
    verify_repo_access(payload.repo, user_id)
    res = get_git_diff(payload.repo, payload.target, payload.source)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@router.get("/blame")
def git_file_blame(
    repo: str = Query(..., description="Repo directory"),
    file: str = Query(..., description="File path"),
    user_id: str = Depends(get_current_user_id),
):
    """Retrieves line-by-line git blame author and commit metadata."""
    verify_repo_access(repo, user_id)
    res = git_blame(repo, file)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@router.post("/commit-message")
def git_suggest_commit_message(
    payload: CommitMessagePayload, user_id: str = Depends(get_current_user_id)
):
    """Suggests an conventional commit message based on staged changes."""
    verify_repo_access(payload.repo, user_id)
    msg = generate_commit_msg(payload.repo)
    return {"commit_message": msg}


@router.get("/explain-commit")
def git_explain_commit(
    repo: str = Query(..., description="Repo directory"),
    hexsha: str = Query(..., description="Commit hexsha identifier"),
    user_id: str = Depends(get_current_user_id),
):
    """Provides an AI-generated explanation and review of changes made in a specific commit."""
    verify_repo_access(repo, user_id)
    res = explain_commit(repo, hexsha)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res


@router.post("/review")
def git_review_pull_request(
    payload: ReviewPayload, user_id: str = Depends(get_current_user_id)
):
    """Runs a simulated Pull Request code review using AI Specialists (bugs, security, performance)."""
    verify_repo_access(payload.repo, user_id)
    res = review_pull_request(payload.repo, payload.source, payload.target)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res
