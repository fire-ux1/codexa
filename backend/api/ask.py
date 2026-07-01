from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from api.schemas import QuestionRequest
from services.rag_service import ask_codepilot, ask_codepilot_stream

router = APIRouter()


@router.post("/ask")
def ask(payload: QuestionRequest):
    if payload.stream:
        return StreamingResponse(
            ask_codepilot_stream(payload.question, payload.repo_path),
            media_type="application/x-ndjson",
        )

    return ask_codepilot(payload.question, payload.repo_path)
