import json
import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.schemas import QuestionRequest
from services.rag_service import ask_codepilot, ask_codepilot_stream
from services.llm_service import generate_answer, generate_answer_stream
from utils.security import validate_safe_path
from api.auth import get_current_user_id
from services.auth_validation import verify_repo_access

router = APIRouter()


class AIActionPayload(BaseModel):
    repo: str
    file: str
    action: str
    selection: str = None
    stream: bool = True


PROMPT_TEMPLATES = {
    "explain": "You are a senior software architect. Explain the following code in detail, highlighting its structure, algorithms, and logic:\n\n```\n{code}\n```",
    "summarize": "Provide a high-level summary of the purpose, exports, and functions of the following file:\n\n```\n{code}\n```",
    "review": "Perform a comprehensive code quality review on the following code. Identify anti-patterns, style violations, readability improvements, and potential issues:\n\n```\n{code}\n```",
    "find_bugs": "Analyze the following code to identify logic errors, edge cases, potential runtime crashes, or incorrect behavior. For each bug, provide a brief explanation and a recommended fix:\n\n```\n{code}\n```",
    "security": "Perform a security scan on the following code. Identify vulnerabilities (e.g., insecure functions, insecure imports, resource leaks, credential exposure) and detail how to mitigate them:\n\n```\n{code}\n```",
    "refactor": "Suggest refactoring strategies for the following code to improve clean code practices, modularity, DRY principles, and extensibility. Provide refactored code blocks where helpful:\n\n```\n{code}\n```",
    "optimize": "Analyze the execution performance and resource usage of the following code. Suggest optimizations for CPU/memory efficiency or database queries:\n\n```\n{code}\n```",
    "generate_tests": "Generate comprehensive unit tests (e.g., using pytest or jest) for the following code, covering happy paths and edge cases:\n\n```\n{code}\n```",
    "generate_docs": "Generate clear documentation, docstrings, or a markdown user guide explaining the usage, signatures, and configuration of the following code:\n\n```\n{code}\n```",
}


def run_action_stream_generator(prompt: str):
    try:
        for token in generate_answer_stream(prompt):
            yield json.dumps({"type": "token", "token": token}) + "\n"
    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"


@router.post("/ask")
def ask(payload: QuestionRequest, user_id: str = Depends(get_current_user_id)):
    if payload.repo_path:
        verify_repo_access(payload.repo_path, user_id)

    if payload.stream:
        return StreamingResponse(
            ask_codepilot_stream(payload.question, payload.repo_path),
            media_type="application/x-ndjson",
        )

    return ask_codepilot(payload.question, payload.repo_path)


@router.post("/action")
def run_ai_action(
    payload: AIActionPayload, user_id: str = Depends(get_current_user_id)
):
    verify_repo_access(payload.repo, user_id)
    abs_path = validate_safe_path(payload.file)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    if payload.selection and payload.selection.strip():
        code_context = payload.selection
    else:
        with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
            code_context = f.read()

    template = PROMPT_TEMPLATES.get(
        payload.action, "Analyze the following code:\n\n```\n{code}\n```"
    )
    prompt = template.format(code=code_context)

    if payload.stream:
        return StreamingResponse(
            run_action_stream_generator(prompt),
            media_type="application/x-ndjson",
        )

    try:
        answer = generate_answer(prompt)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
