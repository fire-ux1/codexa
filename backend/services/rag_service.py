from services.search_service import search_codebase
from services.llm_service import generate_answer


def ask_codepilot(question: str):

    retrieved_chunks = search_codebase(question)

    context = ""

    for chunk in retrieved_chunks:

        context += f"""
FILE: {chunk['file']}

{chunk['snippet']}

----------------
"""

    prompt = f"""
You are a codebase assistant.

Answer ONLY using the provided context.

If the answer is not present in the context, say:

"I could not find the answer in the indexed repository."

CODE CONTEXT:

{context}

QUESTION:

{question}
"""

    answer = generate_answer(prompt)

    return {
        "question": question,
        "answer": answer,
        "sources": retrieved_chunks
    }