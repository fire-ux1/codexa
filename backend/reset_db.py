import sqlite3
from vector_store.chroma_service import reset_collection

print("Resetting database state...")
# Reset Vector DB
reset_collection()
print("Chroma collections reset.")

# Truncate Cache and Telemetry tables in sqlite
DB_PATH = "codepilot.db"
tables = ["embedding_cache", "llm_cache", "analytics_cache", "telemetry_logs"]

try:
    conn = sqlite3.connect(DB_PATH, timeout=15)
    cursor = conn.cursor()
    for table in tables:
        # Check if table exists
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
        if cursor.fetchone():
            cursor.execute(f"DELETE FROM {table}")
            print(f"Truncated table: {table}")
    conn.commit()
    conn.close()
except Exception as e:
    print(f"SQLite Truncate Error: {e}")

print("Done. Clean state prepared for Public Beta Release!")
