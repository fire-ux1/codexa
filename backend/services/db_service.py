import sqlite3
import psycopg2
import psycopg2.pool
import psycopg2.extras
from settings import get_settings

settings = get_settings()
db_pool = None
use_sqlite = False


def get_pool():
    global db_pool, use_sqlite
    if db_pool is None and not use_sqlite:
        try:
            db_pool = psycopg2.pool.ThreadedConnectionPool(
                1, 20, dsn=settings.postgres_url
            )
        except Exception:
            print(
                f"[DB Warning] Failed to connect to PostgreSQL at {settings.postgres_url}. "
                "Falling back to local SQLite database ('codepilot.db')."
            )
            use_sqlite = True
    return db_pool


class PoolConnectionWrapper:
    def __init__(self, pool, conn):
        self._pool = pool
        self._conn = conn

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def cursor(self, *args, **kwargs):
        kwargs.setdefault("cursor_factory", psycopg2.extras.DictCursor)
        return self._conn.cursor(*args, **kwargs)

    def close(self):
        if self._pool and self._conn:
            self._pool.putconn(self._conn)
            self._conn = None
            self._pool = None


class SqliteCursorWrapper:
    def __init__(self, cursor):
        self._cursor = cursor

    def __getattr__(self, name):
        return getattr(self._cursor, name)

    def _translate_sql(self, sql):
        sql_translated = sql.replace("%s", "?")
        sql_translated = sql_translated.replace("%%", "%")

        if "SERIAL PRIMARY KEY" in sql_translated.upper():
            sql_translated = sql_translated.replace(
                "SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT"
            )
        return sql_translated

    def execute(self, sql, parameters=None):
        sql_translated = self._translate_sql(sql)
        if parameters is not None:
            return self._cursor.execute(sql_translated, parameters)
        return self._cursor.execute(sql_translated)

    def executemany(self, sql, seq_of_parameters=None):
        sql_translated = self._translate_sql(sql)
        if seq_of_parameters is not None:
            return self._cursor.executemany(sql_translated, seq_of_parameters)
        return self._cursor.executemany(sql_translated)


class SqliteConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def cursor(self, *args, **kwargs):
        cursor = self._conn.cursor()
        return SqliteCursorWrapper(cursor)

    def close(self):
        self._conn.close()


def get_db():
    global use_sqlite
    if use_sqlite:
        conn = sqlite3.connect("codepilot.db")
        conn.row_factory = sqlite3.Row
        return SqliteConnectionWrapper(conn)

    try:
        pool = get_pool()
        if pool is None:
            raise Exception("Pool is None")
        conn = pool.getconn()
        return PoolConnectionWrapper(pool, conn)
    except Exception:
        use_sqlite = True
        conn = sqlite3.connect("codepilot.db")
        conn.row_factory = sqlite3.Row
        return SqliteConnectionWrapper(conn)


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    try:
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

        # Add token_version column to users if it doesn't exist
        try:
            if use_sqlite:
                cursor.execute("PRAGMA table_info(users)")
                cols = [col[1] for col in cursor.fetchall()]
                if "token_version" not in cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1")
            else:
                cursor.execute(
                    "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='token_version'"
                )
                if not cursor.fetchone():
                    cursor.execute("ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1")
            conn.commit()
        except Exception as e:
            print(f"[DB Warning] Could not check or add token_version column: {e}")
            if not use_sqlite:
                conn.rollback()

        # Create audit_logs table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT,
            project_id TEXT,
            details TEXT,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
        """)

        # Create api_keys table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT,
            key_hash TEXT UNIQUE,
            prefix TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)")
        conn.commit()

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

        # Create telemetry_logs table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry_logs (
            id SERIAL PRIMARY KEY,
            event_type TEXT,
            latency REAL DEFAULT 0,
            success INTEGER DEFAULT 1,
            error_message TEXT,
            token_count INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.commit()
    finally:
        conn.close()


def create_user(user_id: str, email: str, name: str, avatar_url: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO users (id, email, name, avatar_url)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                avatar_url = EXCLUDED.avatar_url
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
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
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
            VALUES (%s, %s, %s, %s, %s, %s)
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
        cursor.execute("SELECT * FROM repositories WHERE id = %s", (repo_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_repositories_for_user(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM repositories WHERE user_id = %s ORDER BY last_accessed DESC",
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
                SET status = %s, files_indexed = %s, chunks_indexed = %s, indexed_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (status, files_indexed, chunks_indexed, repo_id),
            )
        else:
            cursor.execute(
                "UPDATE repositories SET status = %s WHERE id = %s",
                (status, repo_id),
            )
        conn.commit()
    finally:
        conn.close()


def update_repository_access(repo_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE repositories SET last_accessed = CURRENT_TIMESTAMP WHERE id = %s",
            (repo_id,),
        )
        conn.commit()
    finally:
        conn.close()


def delete_repository(repo_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM repositories WHERE id = %s", (repo_id,))
        conn.commit()
    finally:
        conn.close()
