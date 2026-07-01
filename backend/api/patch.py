from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import os
from services.patch_service import handle_patch_generation_stream

router = APIRouter()


class PatchRequestPayload(BaseModel):
    repo: Optional[str] = None
    file_path: str                        # absolute or repo-relative path to target file
    content: Optional[str] = None         # full file content (or selection, if selection_range given)
    selection_range: Optional[dict] = None  # {"startLine": int, "endLine": int}
    instruction: str
    stream: bool = True


class PatchApplyPayload(BaseModel):
    file_path: str
    content: str


@router.post("/patch")
def generate_patch(payload: PatchRequestPayload):
    """Streams the generated patch summary and unified diff for review."""
    if not payload.instruction or not payload.instruction.strip():
        raise HTTPException(status_code=400, detail="Instruction cannot be empty")
    if not payload.file_path:
        raise HTTPException(status_code=400, detail="Target file path is required")

    # If content was sent directly by the frontend, use it as the selection
    selection = payload.content if payload.selection_range else None

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
def apply_patch(payload: PatchApplyPayload):
    """Applies the approved patch by overwriting the file on disk (security-checked)."""
    if not payload.file_path:
        raise HTTPException(status_code=400, detail="File path is required")

    abs_path = os.path.abspath(payload.file_path)
    abs_repos = os.path.abspath("repos")

    # Security: only allow writing inside the repos directory
    if not abs_path.startswith(abs_repos):
        raise HTTPException(
            status_code=403,
            detail="Access denied: file must reside within the repositories directory",
        )

    try:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(payload.content)
        return {"status": "success", "message": "Patch applied successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")
