import uuid
import os
import sqlite3

from services.scanner_service import scan_repository
from services.reader_service import read_file
from services.ast_chunker_service import chunk_python_file

from vector_store.chroma_service import (
    add_chunk,
    reset_collection,
    get_collection_name_for_path,
)


def index_repository_generator(repo_path: str):
    """Generator yielding real-time indexing progress updates."""
    # 1. Repository validation
    yield {
        "progress": 5,
        "stage": "Repository validation",
        "message": f"Validating repository path: {repo_path}...",
    }

    if not repo_path or not os.path.exists(repo_path) or not os.path.isdir(repo_path):
        yield {
            "progress": 100,
            "stage": "Failed",
            "message": f"Invalid repository path: {repo_path}",
        }
        return

    collection_name = get_collection_name_for_path(repo_path)

    # 2. Scanning files
    yield {
        "progress": 15,
        "stage": "Scanning files",
        "message": "Scanning files in repository...",
    }

    scan_result = scan_repository(repo_path)
    total_files = scan_result["total_files"]
    files = scan_result["files"]

    yield {
        "progress": 30,
        "stage": "Scanning files",
        "message": f"Found {total_files} files to process.",
    }

    # Reset collection for this repository
    reset_collection(collection_name)

    # Invalidate analytics cache for this repository path
    try:
        conn = sqlite3.connect("codepilot.db", timeout=15)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM analytics_cache WHERE repo_path = ?", (repo_path,))
        conn.commit()
    except Exception as e:
        print(f"[Analytics Cache] Invalidation error: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    # 3. Chunk generation
    yield {
        "progress": 40,
        "stage": "Chunk generation",
        "message": "Analyzing codebase structure and generating symbols...",
    }

    all_chunks = []
    for file in files:
        file_path = file["path"]
        content = read_file(file_path)

        if not content.strip():
            continue

        if file["extension"] == ".py":
            try:
                chunks = chunk_python_file(content)
            except Exception:
                chunks = [{"name": file["name"], "type": "file", "content": content}]
        else:
            chunks = [{"name": file["name"], "type": "file", "content": content}]

        for c in chunks:
            all_chunks.append({"chunk": c, "file": file})

    total_chunks = len(all_chunks)
    if total_chunks == 0:
        yield {
            "progress": 100,
            "stage": "Completed",
            "message": "No code symbols found to index.",
            "data": {"files_indexed": total_files, "chunks_indexed": 0},
        }
        return

    # 4 & 5. Embedding & Saving Index
    yield {
        "progress": 50,
        "stage": "Generating embeddings",
        "message": f"Processing {total_chunks} code segments...",
    }

    indexed_chunks = 0
    for i, item in enumerate(all_chunks):
        chunk = item["chunk"]
        file = item["file"]
        chunk_id = str(uuid.uuid4())

        # Periodically emit progress during processing
        percent = int(50 + (i / total_chunks) * 45)  # Range 50% to 95%
        if i % max(1, total_chunks // 10) == 0 or i == total_chunks - 1:
            yield {
                "progress": percent,
                "stage": "Generating embeddings",
                "message": f"Embedding and saving chunk {i + 1}/{total_chunks}: {chunk['name']} ({file['name']})",
            }

        add_chunk(
            chunk_id=chunk_id,
            text=chunk["content"],
            metadata={
                "file_name": file["name"],
                "file_path": file["path"],
                "symbol": chunk["name"],
                "symbol_type": chunk["type"],
            },
            collection_name=collection_name,
        )
        indexed_chunks += 1

    # 6. Completed
    yield {
        "progress": 100,
        "stage": "Completed",
        "message": f"Indexing completed successfully! {total_files} files and {indexed_chunks} code symbols saved.",
        "data": {"files_indexed": total_files, "chunks_indexed": indexed_chunks},
    }


def index_repository(repo_path: str):
    """Compatibility function that runs the generator synchronously and returns the final result."""
    result = None
    for step in index_repository_generator(repo_path):
        if step["stage"] == "Completed":
            result = step.get("data")
    return result or {"files_indexed": 0, "chunks_indexed": 0}
