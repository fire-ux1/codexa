from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from services.agents.coordinator import handle_agent_chat_stream

router = APIRouter()

class AgentChatPayload(BaseModel):
    message: str
    agent_type: str = "auto"              # auto, architecture, security, performance, testing, documentation, refactoring, review
    repo: Optional[str] = None
    file: Optional[str] = None
    symbol: Optional[str] = None
    selection: Optional[str] = None
    collaborate: bool = False

@router.post("/agents/chat")
def run_agent_chat(payload: AgentChatPayload):
    """Router to stream specialized agent chat completions."""
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    return StreamingResponse(
        handle_agent_chat_stream(
            repo=payload.repo,
            file=payload.file,
            symbol=payload.symbol,
            selection=payload.selection,
            message=payload.message,
            agent_type=payload.agent_type,
            collaborate=payload.collaborate
        ),
        media_type="text/event-stream"
    )
