import json
from services.llm_service import generate_answer
from services.context_builder import build_context_prompt


def create_implementation_plan(repo_path: str, user_request: str) -> dict:
    """
    Analyzes the codebase and plans the feature implementation.
    Returns a structured checklist of tasks, affected files, estimates, and risks.
    """
    # 1. Gather repository layout context
    base_prompt = build_context_prompt(
        repo_path=repo_path,
        file_path=None,
        symbol_name=None,
        selection=None,
        messages=[],
        user_query=user_request,
    )

    prompt = f"""You are an elite Autonomous Software Architect.
Analyze the repository context and feature request, and plan a step-by-step implementation.

Feature Request:
"{user_request}"

Repository Context:
{base_prompt}

Decompose the request into a list of specific, sequential file modification tasks.
Provide the output in structured JSON format EXACTLY matching this structure:
{{
    "summary": "Overall design approach and architecture changes",
    "complexity": "Low" | "Medium" | "High",
    "estimated_hours": <int representing estimated effort>,
    "risks": [
        "First identified design/security/performance risk",
        "Second risk..."
    ],
    "tasks": [
        {{
            "id": "task_1",
            "file": "relative/path/to/modified/or/new/file.py",
            "action": "MODIFY" | "NEW" | "DELETE",
            "instruction": "Detailed programming instruction for this specific file",
            "complexity": "Low" | "Medium" | "High"
        }}
    ]
}}

Return ONLY the raw JSON structure, with no wrapper, markdown fences, or introduction. Ensure it is valid parseable JSON.
"""
    try:
        res_text = generate_answer(prompt).strip()

        # Clean potential markdown wrappers
        if res_text.startswith("```"):
            lines = res_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            res_text = "\n".join(lines).strip()

        return json.loads(res_text)
    except Exception as e:
        # Structured fallback if LLM output fails parsing
        return {
            "summary": f"Failed to parse planner JSON. Error: {str(e)}",
            "complexity": "Medium",
            "estimated_hours": 4,
            "risks": ["Unexpected parsing error in AI planner output"],
            "tasks": [
                {
                    "id": "task_1",
                    "file": "unknown_file.py",
                    "action": "MODIFY",
                    "instruction": f"Implement user request directly: {user_request}",
                    "complexity": "Medium",
                }
            ],
        }
