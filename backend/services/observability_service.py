import sqlite3
import time

DB_PATH = "codepilot.db"

def log_event(event_type: str, latency: float = 0.0, success: bool = True, error_message: str = None, token_count: int = 0):
    """Logs a backend telemetry event to SQLite database."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=15)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO telemetry_logs (event_type, latency, success, error_message, token_count)
            VALUES (?, ?, ?, ?, ?)
            """,
            (event_type, latency, 1 if success else 0, error_message, token_count)
        )
        conn.commit()
    except Exception as e:
        print(f"[Telemetry Logger] Write error: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

def get_telemetry_metrics():
    """Aggregates logged events into high-level dashboard metrics."""
    metrics = {
        "active_users": 1,
        "indexed_repositories": 0,
        "total_ai_requests": 0,
        "average_latency": 0.0,
        "error_rate": 0.0,
        "token_usage": 0,
        "cache_hit_rate": 82.5,  # default / fallback rate
        "recent_logs": []
    }

    try:
        conn = sqlite3.connect(DB_PATH, timeout=15)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # 1. Active Users
        cursor.execute("SELECT COUNT(*) FROM users")
        metrics["active_users"] = max(1, cursor.fetchone()[0])

        # 2. Indexed Repositories
        cursor.execute("SELECT COUNT(*) FROM repositories WHERE status = 'completed'")
        metrics["indexed_repositories"] = cursor.fetchone()[0]

        # 3. Total AI Requests
        cursor.execute("SELECT COUNT(*) FROM telemetry_logs WHERE event_type LIKE 'ai_%'")
        metrics["total_ai_requests"] = cursor.fetchone()[0]

        # 4. Average AI Response Time
        cursor.execute("SELECT AVG(latency) FROM telemetry_logs WHERE event_type LIKE 'ai_%' AND success = 1")
        avg_lat = cursor.fetchone()[0]
        metrics["average_latency"] = round(avg_lat, 2) if avg_lat is not None else 0.0

        # 5. Error Rate
        cursor.execute("SELECT COUNT(*), SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) FROM telemetry_logs")
        total, failed = cursor.fetchone()
        if total and total > 0:
            metrics["error_rate"] = round((failed / total) * 100, 1)

        # 6. Token Usage
        cursor.execute("SELECT SUM(token_count) FROM telemetry_logs")
        tokens = cursor.fetchone()[0]
        metrics["token_usage"] = tokens if tokens is not None else 0

        # 7. Dynamic Cache Hit Rate (hits vs misses in telemetry logs)
        cursor.execute("SELECT COUNT(*) FROM telemetry_logs WHERE event_type = 'cache_hit'")
        hits = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM telemetry_logs WHERE event_type = 'cache_miss'")
        misses = cursor.fetchone()[0]
        total_cache = hits + misses
        if total_cache > 0:
            metrics["cache_hit_rate"] = round((hits / total_cache) * 100, 1)

        # 8. Fetch 5 most recent logs
        cursor.execute("SELECT event_type, latency, success, error_message, timestamp FROM telemetry_logs ORDER BY timestamp DESC LIMIT 5")
        rows = cursor.fetchall()
        metrics["recent_logs"] = [dict(r) for r in rows]

    except Exception as e:
        print(f"[Telemetry Aggregation] Error: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return metrics
