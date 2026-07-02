import hashlib
import json
import sqlite3
from functools import lru_cache

from sentence_transformers import SentenceTransformer


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    """Load and cache the embedding model."""
    return SentenceTransformer("all-MiniLM-L6-v2")


def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector for the given text, with persistent SQLite cache."""
    if not text:
        return []

    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    db_path = "codepilot.db"

    # Try retrieving from SQLite cache
    try:
        conn = sqlite3.connect(db_path, timeout=15)
        cursor = conn.cursor()
        cursor.execute("SELECT embedding FROM embedding_cache WHERE text_hash = ?", (text_hash,))
        row = cursor.fetchone()
        if row:
            conn.close()
            return json.loads(row[0])
    except Exception as e:
        # Fallback to creating table dynamically if not exists
        try:
            cursor.execute("CREATE TABLE IF NOT EXISTS embedding_cache (text_hash TEXT PRIMARY KEY, embedding TEXT)")
            conn.commit()
        except Exception:
            pass
        print(f"[Embedding Cache] Read error: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    # Generate using model
    vector = get_model().encode(text).tolist()

    # Save back to SQLite cache
    try:
        conn = sqlite3.connect(db_path, timeout=15)
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO embedding_cache (text_hash, embedding) VALUES (?, ?)", (text_hash, json.dumps(vector)))
        conn.commit()
    except Exception as e:
        print(f"[Embedding Cache] Write error: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return vector
