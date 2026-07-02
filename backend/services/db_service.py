import sqlite3

DB_PATH = "codepilot.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Create repositories table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        repository_name TEXT,
        repository_path TEXT,
        branch TEXT,
        indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        files_indexed INTEGER DEFAULT 0,
        chunks_indexed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Create graph_nodes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS graph_nodes (
        id TEXT PRIMARY KEY,
        repo_id TEXT,
        name TEXT,
        type TEXT,
        path TEXT,
        meta TEXT,
        FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
    )
    """)

    # Create graph_edges table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS graph_edges (
        id TEXT PRIMARY KEY,
        repo_id TEXT,
        source_node_id TEXT,
        target_node_id TEXT,
        relation_type TEXT,
        FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
        FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
    )
    """)

    # Create organizations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Create projects table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        org_id TEXT,
        repository_id TEXT,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
    )
    """)

    # Create project_members table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_members (
        project_id TEXT,
        user_id TEXT,
        role TEXT,
        PRIMARY KEY (project_id, user_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Create comments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        file TEXT,
        line INTEGER,
        comment_text TEXT,
        author TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)

    # Create caching tables for performance
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS embedding_cache (
        text_hash TEXT PRIMARY KEY,
        embedding TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS llm_cache (
        prompt_hash TEXT PRIMARY KEY,
        response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analytics_cache (
        repo_path TEXT PRIMARY KEY,
        analytics_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT,
        latency REAL DEFAULT 0,
        success INTEGER DEFAULT 1,
        error_message TEXT,
        token_count INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()


def create_user(user_id: str, email: str, name: str, avatar_url: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT OR REPLACE INTO users (id, email, name, avatar_url)
            VALUES (?, ?, ?, ?)
        """,
            (user_id, email, name, avatar_url),
        )
        conn.commit()
    finally:
        conn.close()


def get_user(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create_repository(
    repo_id: str, user_id: str, name: str, path: str, branch: str, status: str
):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO repositories (id, user_id, repository_name, repository_path, branch, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (repo_id, user_id, name, path, branch, status),
        )
        conn.commit()
    finally:
        conn.close()


def get_repository(repo_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_repositories_for_user(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM repositories WHERE user_id = ? ORDER BY last_accessed DESC",
            (user_id,),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def update_repository_status(
    repo_id: str, status: str, files_indexed: int = None, chunks_indexed: int = None
):
    conn = get_db()
    cursor = conn.cursor()
    try:
        if files_indexed is not None and chunks_indexed is not None:
            cursor.execute(
                """
                UPDATE repositories
                SET status = ?, files_indexed = ?, chunks_indexed = ?, indexed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """,
                (status, files_indexed, chunks_indexed, repo_id),
            )
        else:
            cursor.execute(
                "UPDATE repositories SET status = ? WHERE id = ?", (status, repo_id)
            )
        conn.commit()
    finally:
        conn.close()


def update_repository_access(repo_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE repositories SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?",
            (repo_id,),
        )
        conn.commit()
    finally:
        conn.close()


def delete_repository(repo_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM repositories WHERE id = ?", (repo_id,))
        conn.commit()
    finally:
        conn.close()
