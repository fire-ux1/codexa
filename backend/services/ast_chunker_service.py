import ast


def chunk_python_file(code: str):

    chunks = []

    try:

        lines = code.splitlines()

        tree = ast.parse(code)

        for node in ast.walk(tree):

            if isinstance(
                node,
                (ast.FunctionDef, ast.ClassDef)
            ):

                chunk_code = "\n".join(
                    lines[
                        node.lineno - 1:
                        node.end_lineno
                    ]
                )

                chunks.append({
                    
                    "name": "clone_repo",
                    "type": "FunctionDef",
                    "file": "repository.py",
                    "content": "...",
                    "line_start": 5,
                    "line_end": 12

                })

    except Exception as e:

        print(f"AST Error: {e}")

    return chunks