import os
import sys
import sqlite3
import psycopg2
import psycopg2.pool
import psycopg2.extras
from settings import get_settings

settings = get_settings()
db_pool = None
use_sqlite = False


def _get_sqlite_path() -> str:
    """Returns the SQLite database path. Uses /tmp/ in Cloud Run (read-only filesystem)."""
    if "pytest" in sys.modules:
        return "file::memory:?cache=shared"
    if "K_SERVICE" in os.environ:
        return "/tmp/codepilot.db"
    return "codepilot.db"


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
                f"Falling back to local SQLite database ('{_get_sqlite_path()}')."
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


test_keep_alive_conn = None


def get_db():
    global use_sqlite, test_keep_alive_conn
    if use_sqlite:
        if "pytest" in sys.modules and test_keep_alive_conn is None:
            test_keep_alive_conn = sqlite3.connect(
                "file::memory:?cache=shared", uri=True
            )

        db_path = _get_sqlite_path()
        uri = db_path.startswith("file:")
        conn = sqlite3.connect(db_path, timeout=30.0, uri=uri)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA busy_timeout=30000;")
        except Exception:
            pass
        return SqliteConnectionWrapper(conn)

    try:
        pool = get_pool()
        if pool is None:
            raise Exception("Pool is None")
        conn = pool.getconn()
        return PoolConnectionWrapper(pool, conn)
    except Exception:
        use_sqlite = True
        if "pytest" in sys.modules and test_keep_alive_conn is None:
            test_keep_alive_conn = sqlite3.connect(
                "file::memory:?cache=shared", uri=True
            )

        db_path = _get_sqlite_path()
        uri = db_path.startswith("file:")
        conn = sqlite3.connect(db_path, timeout=30.0, uri=uri)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA busy_timeout=30000;")
        except Exception:
            pass
        return SqliteConnectionWrapper(conn)


def run_alembic_migrations():
    import os
    from alembic.config import Config
    from alembic import command

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(base_dir, "alembic.ini")

    alembic_cfg = Config(ini_path)
    alembic_cfg.set_main_option("sqlalchemy.url", settings.postgres_url)

    print("[DB] Running Alembic migrations...")
    command.upgrade(alembic_cfg, "head")
    print("[DB] Alembic migrations completed successfully.")


def init_db():
    global use_sqlite
    # Establish connection once to determine if SQLite or Postgres
    try:
        conn = get_db()
        conn.close()
    except Exception as e:
        print(f"[DB Error] Failed to establish database connection during init: {e}")
        use_sqlite = True

    if use_sqlite:
        print(
            "[DB] Using local SQLite database. Initializing table structure directly."
        )
        init_sqlite_db()
    else:
        try:
            run_alembic_migrations()
            init_sqlite_db()
        except Exception as e:
            print(
                f"[DB Warning] Alembic migrations failed: {e}. Falling back to SQLite."
            )
            use_sqlite = True
            init_sqlite_db()


def init_sqlite_db():
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
            mfa_secret TEXT DEFAULT NULL,
            mfa_enabled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Add token_version and MFA columns to users if they don't exist
        try:
            if use_sqlite:
                cursor.execute("PRAGMA table_info(users)")
                cols = [col[1] for col in cursor.fetchall()]
                if "token_version" not in cols:
                    cursor.execute(
                        "ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1"
                    )
                if "mfa_secret" not in cols:
                    cursor.execute(
                        "ALTER TABLE users ADD COLUMN mfa_secret TEXT DEFAULT NULL"
                    )
                if "mfa_enabled" not in cols:
                    cursor.execute(
                        "ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE"
                    )
            else:
                cursor.execute(
                    "SELECT column_name FROM information_schema.columns WHERE table_name='users'"
                )
                cols = [row["column_name"] for row in cursor.fetchall()]
                if "token_version" not in cols:
                    cursor.execute(
                        "ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1"
                    )
                if "mfa_secret" not in cols:
                    cursor.execute(
                        "ALTER TABLE users ADD COLUMN mfa_secret TEXT DEFAULT NULL"
                    )
                if "mfa_enabled" not in cols:
                    cursor.execute(
                        "ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE"
                    )
            conn.commit()
        except Exception as e:
            print(
                f"[DB Warning] Could not check or add token_version or MFA columns: {e}"
            )
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
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)"
        )

        # Create notifications table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            message TEXT,
            read BOOLEAN DEFAULT FALSE,
            type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """)

        # Create compliance_settings table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS compliance_settings (
            id TEXT PRIMARY KEY,
            hipaa_mode BOOLEAN DEFAULT FALSE,
            sox_mode BOOLEAN DEFAULT FALSE,
            retention_days INTEGER DEFAULT 90,
            session_timeout BOOLEAN DEFAULT TRUE,
            slack_enabled BOOLEAN DEFAULT FALSE,
            jira_enabled BOOLEAN DEFAULT FALSE,
            github_ent_enabled BOOLEAN DEFAULT FALSE
        )
        """)

        # Seed default compliance settings
        cursor.execute("SELECT 1 FROM compliance_settings WHERE id = 'default'")
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO compliance_settings (id, hipaa_mode, sox_mode, retention_days, session_timeout) VALUES ('default', FALSE, FALSE, 90, TRUE)"
            )

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

        # Create reports table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            repository_id TEXT,
            name TEXT,
            report_type TEXT,
            s3_key TEXT,
            file_size INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
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


def delete_repository(repo_id: str):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM repositories WHERE id = %s", (repo_id,))
        conn.commit()
    finally:
        conn.close()


def create_report(
    report_id: str,
    repository_id: str,
    name: str,
    report_type: str,
    s3_key: str,
    file_size: int,
):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO reports (id, repository_id, name, report_type, s3_key, file_size)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (report_id, repository_id, name, report_type, s3_key, file_size),
        )
        conn.commit()
    finally:
        conn.close()


def get_reports_by_repo(repository_id: str) -> list[dict]:
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT * FROM reports WHERE repository_id = %s ORDER BY created_at DESC",
            (repository_id,),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_report(report_id: str) -> dict | None:
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM reports WHERE id = %s", (report_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
