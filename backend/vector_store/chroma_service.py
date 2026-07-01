# pyrefly: ignore [missing-import]
import chromadb
from chromadb.errors import NotFoundError
import hashlib
from services.embedding_service import generate_embedding

COLLECTION_NAME = "code_chunks"

client = chromadb.PersistentClient(path="chroma_db")


class LocalEmbeddingFunction(chromadb.EmbeddingFunction):
    def __call__(self, input: chromadb.Documents) -> chromadb.Embeddings:
        return [generate_embedding(doc) for doc in input]


def get_collection_name_for_path(repo_path: str) -> str:
    """Deterministic, ChromaDB-compatible collection name based on repository path."""
    if not repo_path:
        return COLLECTION_NAME
    # Normalize the path
    normalized = repo_path.replace("\\", "/").strip("/")
    path_hash = hashlib.md5(normalized.encode("utf-8")).hexdigest()
    return f"repo_{path_hash}"


def get_collection(collection_name: str = COLLECTION_NAME):
    try:
        return client.get_or_create_collection(
            name=collection_name, embedding_function=LocalEmbeddingFunction()
        )
    except ValueError as e:
        if "embedding function" in str(e).lower() or "conflict" in str(e).lower():
            try:
                client.delete_collection(collection_name)
            except Exception:
                pass
            return client.get_or_create_collection(
                name=collection_name, embedding_function=LocalEmbeddingFunction()
            )
        raise e


def add_chunk(chunk_id, text, metadata, collection_name: str = COLLECTION_NAME):
    try:
        collection = get_collection(collection_name)
        collection.add(
            ids=[chunk_id],
            documents=[text],
            metadatas=[metadata],
        )
    except NotFoundError:
        collection = get_collection(collection_name)
        collection.add(
            ids=[chunk_id],
            documents=[text],
            metadatas=[metadata],
        )


def search_chunks(
    query: str, n_results: int = 5, collection_name: str = COLLECTION_NAME
):
    collection = get_collection(collection_name)
    return collection.query(
        query_texts=[query],
        n_results=n_results,
    )


def reset_collection(collection_name: str = COLLECTION_NAME):
    try:
        client.delete_collection(collection_name)
    except NotFoundError:
        pass

    return get_collection(collection_name)


def delete_collection(collection_name: str):
    """Delete a specific ChromaDB collection."""
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass
