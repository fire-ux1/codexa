from services.scanner_service import scan_repository
from services.reader_service import read_file
from services.ast_chunker_service import chunk_python_file


def get_repository_symbols(repo_path: str):

    symbols = []

    scan_result = scan_repository(repo_path)

    for file in scan_result["files"]:

        if file["extension"] != ".py":
            continue

        content = read_file(file["path"])

        chunks = chunk_python_file(content)

        for chunk in chunks:

            symbols.append(
                {
                    "file": file["name"],
                    "name": chunk["name"],
                    "type": chunk["type"],
                    "content": chunk["content"][:500]
                }
            )

    return symbols