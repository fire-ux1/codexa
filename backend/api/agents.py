from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from services.agents.coordinator import handle_agent_chat_stream
from api.auth import get_current_user_id
from services.auth_validation import verify_repo_access, verify_file_access

router = APIRouter()


class AgentChatPayload(BaseModel):
    message: str
    agent_type: str = "auto"  # auto, architecture, security, performance, testing, documentation, refactoring, review
    repo: Optional[str] = None
    file: Optional[str] = None
    symbol: Optional[str] = None
    selection: Optional[str] = None
    collaborate: bool = False


@router.post("/agents/chat")
def run_agent_chat(
    payload: AgentChatPayload, user_id: str = Depends(get_current_user_id)
):
    """Router to stream specialized agent chat completions."""
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Verify repo access if provided
    if payload.repo:
        verify_repo_access(payload.repo, user_id)

    # Verify file access if provided
    if payload.file:
        verify_file_access(payload.file, user_id)

    return StreamingResponse(
        handle_agent_chat_stream(
            repo=payload.repo,
            file=payload.file,
            symbol=payload.symbol,
            selection=payload.selection,
            message=payload.message,
            agent_type=payload.agent_type,
            collaborate=payload.collaborate,
        ),
        media_type="text/event-stream",
    )
