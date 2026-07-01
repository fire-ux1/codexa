from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.conversation_memory import memory_manager
from services.workspace_service import handle_workspace_chat_stream

router = APIRouter()

class WorkspaceChatPayload(BaseModel):
    repo: str | None = None
    file: str | None = None
    symbol: str | None = None
    selection: str | None = None
    conversation_id: str | None = None
    message: str

@router.post("/chat")
def workspace_chat(payload: WorkspaceChatPayload):
    """Router to stream conversation completions under workspace context constraints."""
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    return StreamingResponse(
        handle_workspace_chat_stream(
            repo=payload.repo,
            file=payload.file,
            symbol=payload.symbol,
            selection=payload.selection,
            conversation_id=payload.conversation_id,
            message=payload.message
        ),
        media_type="application/x-ndjson"
    )

@router.get("/conversations")
def list_conversations():
    """Lists recent session identifiers and summaries."""
    return memory_manager.list_sessions()

@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str):
    """Fetches details, message history, and context limits of a single session."""
    session = memory_manager.get(conversation_id)
    if not session:
        raise HTTPException(status_code=404, detail="Conversation session not found")
    return session.to_dict()
