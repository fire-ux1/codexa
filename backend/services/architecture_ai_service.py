from services.architecture_service import generate_structure
from services.llm_service import generate_answer


def explain_architecture(repo_path: str):

    structure = generate_structure(repo_path)

    prompt = f"""
You are a senior software architect.

Analyze this repository structure.

Explain:

1. Purpose of the project
2. Main components
3. Architecture pattern
4. Strengths
5. Suggested improvements

Repository Structure:

{structure}
"""

    explanation = generate_answer(prompt)

    return {
        "structure": structure,
        "analysis": explanation
    }