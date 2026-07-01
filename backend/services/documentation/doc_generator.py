from services.llm_service import generate_answer
from services.context_builder import build_context_prompt


def generate_doc_asset(repo_path: str, doc_type: str) -> str:
    """Generates structured markdown documentation assets using the LLM repository context."""
    # Build codebase context
    base_prompt = build_context_prompt(
        repo_path=repo_path,
        file_path=None,
        symbol_name=None,
        selection=None,
        messages=[],
        user_query=f"Generate {doc_type} documentation",
    )

    doc_topics = {
        "readme": "README.md: detailing setup instructions, prerequisites, running scripts, and code highlights.",
        "api": "API.md: detailing REST endpoint routes, query parameters, payloads, headers, and status codes.",
        "architecture": "Architecture.md: detailing software layers, design choices, circular check highlights, and Mermaid diagrams.",
    }

    topic_desc = doc_topics.get(doc_type.lower(), "Documentation guide")

    prompt = f"""You are a senior technical writer and developer advocate.
Generate a professional `{doc_type.upper()}.md` asset for this repository based on the codebase context.

Doc Spec Requirement:
{topic_desc}

Repository Context:
{base_prompt}

Write a comprehensive, publication-ready markdown output.
Return ONLY the raw markdown text with no meta instructions or surrounding wrapper backticks.
"""
    return generate_answer(prompt).strip()
