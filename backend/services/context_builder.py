import os

SLASH_COMMAND_TEMPLATES = {
    "/explain": "Explain the following code segment or focus area in detail:\n{message}",
    "/review": "Perform a comprehensive code review on the active code. Identify anti-patterns, readability issues, and bugs:\n{message}",
    "/test": "Generate comprehensive unit tests (e.g., using pytest or Jest) for the following code segment:\n{message}",
    "/docs": "Generate clear code documentation, docstrings, or markdown guides explaining the usage of:\n{message}",
    "/refactor": "Suggest refactoring strategies to improve DRY principles, readability, and clean architecture for:\n{message}",
    "/security": "Perform a security scan on this code. Identify weaknesses, unsafe functions, or leaks:\n{message}",
    "/architecture": "Explain how this file or selection fits into the overall repository architecture:\n{message}",
    "/summary": "Provide a high-level summary of the exports, modules, and intent of:\n{message}",
}


def parse_slash_command(message: str) -> str:
    """Detects slash commands and reformats the query with templates."""
    trimmed = message.strip()
    for cmd, template in SLASH_COMMAND_TEMPLATES.items():
        if trimmed.startswith(cmd):
            remaining = trimmed[len(cmd) :].strip()
            return template.format(message=remaining or "the active code block/context")
    return message


def build_context_prompt(
    repo_path: str,
    file_path: str,
    symbol_name: str,
    selection: str,
    messages: list,
    user_query: str,
) -> str:
    """Assembles structured prompt context for LLM completion."""
    context_blocks = []

    # 1. Repository Context
    if repo_path:
        repo_name = os.path.basename(repo_path)
        context_blocks.append(f"Current Repository: {repo_name} (Path: {repo_path})")

    # 2. File Context
    if file_path:
        context_blocks.append(f"Active File: {file_path}")
        abs_path = os.path.abspath(file_path)
        if os.path.exists(abs_path) and os.path.isfile(abs_path):
            try:
                with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                # Protect context window by truncating files larger than 12KB
                if len(content) > 12000:
                    content = content[:12000] + "\n... [truncated due to file length]"

                context_blocks.append(f"Active File Content:\n```\n{content}\n```")
            except Exception:
                pass

    # 3. Active Class/Function Symbol Focus
    if symbol_name:
        context_blocks.append(
            f"Active Symbol Focus: {symbol_name} (Current cursor position)"
        )

    # 4. Text Selection Context
    if selection and selection.strip():
        context_blocks.append(f"Current Selected Code:\n```\n{selection}\n```")

    # Format the context lines
    context_str = "\n\n".join(context_blocks)

    # 5. Formulate dialogue history context
    history_lines = []
    for msg in messages:
        role = "Developer" if msg["role"] == "user" else "Assistant"
        history_lines.append(f"{role}: {msg['content']}")

    history_str = "\n".join(history_lines)

    # Re-evaluate user query with slash commands
    reformatted_query = parse_slash_command(user_query)

    # Assemble final instructions
    prompt = f"""You are an expert AI software engineering workspace assistant (CodePilot AI).
Provide high-quality technical help. When writing code, output proper markdown code blocks with correct syntax.

==================================================
WORKSPACE CONTEXT:
{context_str}
==================================================

CONVERSATION HISTORY:
{history_str}

Developer: {reformatted_query}
Assistant:"""
    return prompt
