import json
from services.conversation_memory import memory_manager
from services.context_builder import build_context_prompt
from services.llm_service import generate_answer_stream


def handle_workspace_chat_stream(
    repo: str,
    file: str,
    symbol: str,
    selection: str,
    conversation_id: str,
    message: str,
):
    """Orchestrates streaming chatbot responses and appends to session history."""
    # 1. Get or instantiate session
    session = memory_manager.get_or_create(conversation_id)

    # 2. Update context bounds
    session.repo = repo or session.repo
    session.file = file or session.file
    session.symbol = symbol or session.symbol
    session.selection = selection or session.selection

    # 3. Build prompt
    prompt = build_context_prompt(
        repo_path=session.repo,
        file_path=session.file,
        symbol_name=session.symbol,
        selection=session.selection,
        messages=session.messages,
        user_query=message,
    )

    # 4. Save user request
    session.messages.append({"role": "user", "content": message})

    # 5. Stream from LLM
    tokens = []
    try:
        for token in generate_answer_stream(prompt):
            tokens.append(token)
            yield json.dumps({"type": "token", "token": token}) + "\n"
    except Exception as e:
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"
        return

    # 6. Commit assistant response to session
    assistant_response = "".join(tokens)
    session.messages.append({"role": "assistant", "content": assistant_response})
