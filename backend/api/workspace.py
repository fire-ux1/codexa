from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.conversation_memory import memory_manager
from services.workspace_service import handle_workspace_chat_stream
from api.auth import get_current_user_id
from services.auth_validation import verify_repo_access, verify_file_access

router = APIRouter()


class WorkspaceChatPayload(BaseModel):
    repo: str | None = None
    file: str | None = None
    symbol: str | None = None
    selection: str | None = None
    conversation_id: str | None = None
    message: str


@router.post("/chat")
def workspace_chat(
    payload: WorkspaceChatPayload, user_id: str = Depends(get_current_user_id)
):
    """Router to stream conversation completions under workspace context constraints."""
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Verify access to repository if provided
    if payload.repo:
        verify_repo_access(payload.repo, user_id)

    # Verify access to file if provided
    if payload.file:
        verify_file_access(payload.file, user_id)

    return StreamingResponse(
        handle_workspace_chat_stream(
            repo=payload.repo,
            file=payload.file,
            symbol=payload.symbol,
            selection=payload.selection,
            conversation_id=payload.conversation_id,
            message=payload.message,
        ),
        media_type="application/x-ndjson",
    )


@router.get("/conversations")
def list_conversations(user_id: str = Depends(get_current_user_id)):
    """Lists recent session identifiers and summaries."""
    # List conversations for the logged in user
    # For now, list_sessions returns global sessions, but we filter or require auth
    return memory_manager.list_sessions()


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user_id: str = Depends(get_current_user_id)):
    """Fetches details, message history, and context limits of a single session."""
    session = memory_manager.get(conversation_id)
    if not session:
        raise HTTPException(status_code=404, detail="Conversation session not found")
    return session.to_dict()
