from vector_store.chroma_service import search_chunks


def search_codebase(query: str):

    results = search_chunks(query)

    formatted = []

    docs = results["documents"][0]
    metas = results["metadatas"][0]
    distances = results["distances"][0]

    for doc, meta, distance in zip(
        docs,
        metas,
        distances
    ):

        formatted.append({
        "file": meta["file_name"],
        "path": meta["file_path"],
        "symbol": meta.get("symbol"),
        "type": meta.get("symbol_type"),
        "score": round(distance, 4),
        "snippet": doc[:300]
    })

    return formatted