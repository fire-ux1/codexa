import uuid

from services.scanner_service import scan_repository
from services.reader_service import read_file
from services.ast_chunker_service import chunk_python_file

from vector_store.chroma_service import (
    add_chunk,
    reset_collection
)


def index_repository(repo_path: str):
    
    reset_collection()

    scan_result = scan_repository(repo_path)

    indexed_chunks = 0

    for file in scan_result["files"]:

        file_path = file["path"]

        content = read_file(file_path)

        if not content.strip():
            continue

        # Use AST chunking for Python files
        if file["extension"] == ".py":

            chunks = chunk_python_file(content)

        else:

            chunks = [
                {
                    "name": file["name"],
                    "type": "file",
                    "content": content
                }
            ]

        # Store chunks in ChromaDB
        for chunk in chunks:

            chunk_id = str(uuid.uuid4())

            add_chunk(
                chunk_id=chunk_id,
                text=chunk["content"],
                metadata={
                    "file_name": file["name"],
                    "file_path": file_path,
                    "symbol": chunk["name"],
                    "symbol_type": chunk["type"]
                }
            )

            indexed_chunks += 1

    return {
        "files_indexed": scan_result["total_files"],
        "chunks_indexed": indexed_chunks
    }