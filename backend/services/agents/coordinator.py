import json
from services.llm_service import generate_answer, generate_answer_stream
from services.context_builder import build_context_prompt
from services.agents import (
    architecture_agent,
    security_agent,
    performance_agent,
    testing_agent,
    documentation_agent,
    refactoring_agent,
    review_agent,
)

AGENT_PROMPTS = {
    "architecture": architecture_agent.SYSTEM_PROMPT,
    "security": security_agent.SYSTEM_PROMPT,
    "performance": performance_agent.SYSTEM_PROMPT,
    "testing": testing_agent.SYSTEM_PROMPT,
    "documentation": documentation_agent.SYSTEM_PROMPT,
    "refactoring": refactoring_agent.SYSTEM_PROMPT,
    "review": review_agent.SYSTEM_PROMPT,
}


def classify_query_for_agent(message: str) -> str:
    """Uses LLM to classify user query into one of the specialized agent types."""
    prompt = f"""You are a query classifier for a multi-agent AI coding platform.
Classify the following query into exactly one of these categories:
- architecture (for structure, layout, dependencies, layers, module placement)
- security (for OWASP, SQL injection, secrets, authentication, encryption, bugs with security risk)
- performance (for runtime speed, memory leaks, algorithmic complexity, queries, CPU load)
- testing (for mock setup, pytest, assertions, unit testing, test coverage)
- documentation (for docstrings, READMEs, explanations of how things work, comments)
- refactoring (for duplicating code, SOLID, variable naming, logic simplification, clean code)
- review (for general code reviews, syntax styles, best practice audits)

Query:
"{message}"

Return ONLY the classification string (e.g. "security" or "performance") and nothing else. No punctuation, no explanation.
"""
    try:
        category = generate_answer(prompt).strip().lower()
        if category in AGENT_PROMPTS:
            return category
    except Exception:
        pass
    # Fallback to general review agent
    return "review"


def handle_agent_chat_stream(
    repo: str,
    file: str,
    symbol: str,
    selection: str,
    message: str,
    agent_type: str,  # "auto", "architecture", "security", etc.
    collaborate: bool = False,
):
    """
    Orchestrates specialized agent analysis or sequential agent collaboration.
    Yields NDJSON streaming tokens compatible with the frontend client.
    """
    # 1. Determine agent(s) to run
    agents_to_run = []

    if collaborate:
        # Collaboration Mode runs Architecture, Security, and Performance agents in order
        agents_to_run = ["architecture", "security", "performance"]
        yield (
            json.dumps(
                {
                    "type": "token",
                    "token": "### 🤖 Multi-Agent Collaboration Report\n*Running Architecture, Security, and Performance specialists in sequence...*\n\n---\n",
                }
            )
            + "\n"
        )
    else:
        # Single agent mode
        selected = agent_type.strip().lower()
        if selected == "auto":
            selected = classify_query_for_agent(message)
            yield (
                json.dumps(
                    {
                        "type": "token",
                        "token": f"*(Auto-routed query to **{selected.capitalize()} Agent**)*\n\n",
                    }
                )
                + "\n"
            )

        if selected not in AGENT_PROMPTS:
            selected = "review"

        agents_to_run = [selected]

    # 2. Build code context prompt
    # Note: we use empty messages history so each agent works fresh on the current query + context
    base_prompt = build_context_prompt(
        repo_path=repo,
        file_path=file,
        symbol_name=symbol,
        selection=selection,
        messages=[],
        user_query=message,
    )

    # 3. Execute agent(s)
    for agent in agents_to_run:
        system_prompt = AGENT_PROMPTS[agent]

        if collaborate:
            yield (
                json.dumps(
                    {
                        "type": "token",
                        "token": f"\n#### 🔬 Specialist: {agent.capitalize()} Agent\n",
                    }
                )
                + "\n"
            )

        # Combine system prompt with workspace context prompt
        combined_prompt = f"{system_prompt}\n\nUser request is: {message}\n\nWorkspace Context:\n{base_prompt}"

        try:
            for token in generate_answer_stream(combined_prompt):
                yield json.dumps({"type": "token", "token": token}) + "\n"
            yield json.dumps({"type": "token", "token": "\n\n---\n"}) + "\n"
        except Exception as e:
            yield (
                json.dumps(
                    {
                        "type": "error",
                        "message": f"Error running {agent} agent: {str(e)}",
                    }
                )
                + "\n"
            )
            return

    yield (
        json.dumps({"type": "token", "token": "\n*Collaboration analysis complete.*"})
        + "\n"
    )
