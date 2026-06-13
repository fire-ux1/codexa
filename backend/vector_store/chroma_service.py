import chromadb

client = chromadb.PersistentClient(
    path="chroma_db"
)

collection = client.get_or_create_collection(
    name="code_chunks"
)


def add_chunk(
    chunk_id,
    text,
    metadata
):

    collection.add(
        ids=[chunk_id],
        documents=[text],
        metadatas=[metadata]
    )
    
def search_chunks(
    query: str,
    n_results: int = 5
):

    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )

    return results

def reset_collection():

    global collection

    try:
        client.delete_collection("code_chunks")
    except:
        pass

    collection = client.get_or_create_collection(
        name="code_chunks"
    )