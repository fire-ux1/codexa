import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure backend root is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.db_service import get_db
from services.redis_service import enqueue_indexing_task


def requeue_stuck_tasks(timeout_minutes: int = 30):
    print(
        f"[Management] Checking for stuck repository indexing tasks (older than {timeout_minutes} minutes)..."
    )

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Fetch repositories with status 'indexing'
        cursor.execute(
            "SELECT id, user_id, repository_name, repository_path, indexed_at FROM repositories WHERE status = 'indexing'"
        )
        rows = cursor.fetchall()

        now = datetime.now(timezone.utc)
        requeued_count = 0

        for row in rows:
            if isinstance(row, dict):
                repo_id = row["id"]
                user_id = row["user_id"]
                repo_name = row["repository_name"]
                repo_path = row["repository_path"]
                indexed_at = row["indexed_at"]
            else:
                repo_id = row[0]
                user_id = row[1]
                repo_name = row[2]
                repo_path = row[3]
                indexed_at = row[4]

            # Parse indexed_at timestamp
            if indexed_at is None:
                continue

            if isinstance(indexed_at, str):
                try:
                    dt = datetime.fromisoformat(indexed_at.replace("Z", "+00:00"))
                except ValueError:
                    try:
                        dt = datetime.strptime(indexed_at, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        continue
            else:
                dt = indexed_at

            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)

            age = now - dt
            if age > timedelta(minutes=timeout_minutes):
                print(
                    f"[Management] Found stuck repository: {repo_name} (ID: {repo_id}, Path: {repo_path}, Age: {age})"
                )

                # Re-queue task
                success = enqueue_indexing_task(repo_path, repo_id, user_id)
                if success:
                    print(f"[Management] Successfully re-queued task for {repo_name}.")
                    requeued_count += 1
                else:
                    print(f"[Management] Failed to re-queue task for {repo_name}.")

        print(f"[Management] Check complete. Re-queued {requeued_count} stuck task(s).")

    finally:
        conn.close()


if __name__ == "__main__":
    requeue_stuck_tasks()
