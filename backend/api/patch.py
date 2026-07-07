from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import os
from services.patch_service import handle_patch_generation_stream
from api.auth import get_current_user_id
from services.auth_validation import verify_repo_write_access, verify_file_access

router = APIRouter()


class PatchRequestPayload(BaseModel):
    repo: Optional[str] = None
    file_path: str  # absolute or repo-relative path to target file
    content: Optional[str] = (
        None  # full file content (or selection, if selection_range given)
    )
    selection_range: Optional[dict] = None  # {"startLine": int, "endLine": int}
    instruction: str
    stream: bool = True


class PatchApplyPayload(BaseModel):
    file_path: str
    content: str


@router.post("/patch")
def generate_patch(payload: PatchRequestPayload, user_id: str = Depends(get_current_user_id)):
    """Streams the generated patch summary and unified diff for review."""
    # Verify write access to file and repository
    verify_file_access(payload.file_path, user_id, write=True)
    if payload.repo:
        verify_repo_write_access(payload.repo, user_id)

    if not payload.instruction or not payload.instruction.strip():
        raise HTTPException(status_code=400, detail="Instruction cannot be empty")
    if not payload.file_path:
        raise HTTPException(status_code=400, detail="Target file path is required")

    # If content was sent directly by the frontend, use it as the selection
    selection = payload.content if payload.selection_range else None

    from services.audit_service import log_audit_event
    log_audit_event(
        user_id=user_id,
        action="generate_patch",
        details={"file": payload.file_path}
    )

    return StreamingResponse(
        handle_patch_generation_stream(
            repo_path=payload.repo,
            file_path=payload.file_path,
            selection=selection,
            instruction=payload.instruction,
        ),
        media_type="text/event-stream",
    )


@router.post("/apply")
def apply_patch(payload: PatchApplyPayload, user_id: str = Depends(get_current_user_id)):
    """Applies the approved patch by overwriting the file on disk (security-checked)."""
    if not payload.file_path:
        raise HTTPException(status_code=400, detail="File path is required")

    # Verify write access to target file
    verify_file_access(payload.file_path, user_id, write=True)

    abs_path = os.path.abspath(payload.file_path)
    abs_repos = os.path.abspath("repos")

    # Security: only allow writing inside the repos directory (defense in depth)
    if not abs_path.startswith(abs_repos):
        raise HTTPException(
            status_code=403,
            detail="Access denied: file must reside within the repositories directory",
        )

    try:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(payload.content)

        from services.audit_service import log_audit_event
        log_audit_event(
            user_id=user_id,
            action="apply_patch",
            details={"file": payload.file_path}
        )

        return {"status": "success", "message": "Patch applied successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")
