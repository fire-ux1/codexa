from services.architecture_service import generate_structure
from services.symbol_service import get_repository_symbols
from services.llm_service import generate_answer


def review_repository(repo_path: str):

    structure = generate_structure(repo_path)

    symbols = get_repository_symbols(repo_path)

    symbol_text = ""

    for symbol in symbols[:20]:

        symbol_text += f"""
FILE: {symbol['file']}
SYMBOL: {symbol['name']}
TYPE: {symbol['type']}

{symbol['content']}

-----------------------------------
"""

    prompt = f"""
You are a senior staff software engineer.

Review this repository.

Repository Structure:

{structure}

Key Functions And Classes:

{symbol_text}

Provide:

1. Project Summary
2. Architecture Assessment
3. Strengths
4. Weaknesses
5. Security Issues
6. Scalability Issues
7. Code Quality Issues
8. Recommendations

Be specific and refer to actual functions when possible.
"""

    review = generate_answer(prompt)

    return {
        "review": review
    }