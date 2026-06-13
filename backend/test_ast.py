from services.reader_service import read_file
from services.ast_chunker_service import chunk_python_file

code = read_file(
    "repos/codepilot-ai/backend/services/repo_service.py"
)

chunks = chunk_python_file(code)

for chunk in chunks:

    print("=" * 50)

    print(chunk["name"])

    print(chunk["type"])

    print(chunk["content"])

    print("=" * 50)