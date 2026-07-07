import sys
import os
import signal
import time

# Ensure current directory is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.db_service import init_db, update_repository_status
from services.indexing_service import index_repository_generator
from services.knowledge_graph.graph_builder import build_knowledge_graph
from services.redis_service import (
    dequeue_indexing_task,
    update_indexing_progress,
)

shutdown_requested = False


def signal_handler(signum, frame):
    global shutdown_requested
    print(f"\n[Worker] Received shutdown signal ({signum}). Graceful exit requested...")
    shutdown_requested = True


def run_worker():
    global shutdown_requested
    print("[Worker] Initializing CodePilot AI Distributed Worker...")

    # Initialize DB (creates tables if they don't exist yet)
    try:
        init_db()
    except Exception as e:
        print(f"[Worker] DB init warning: {e}")

    # Register signals
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("[Worker] Worker successfully started. Listening for indexing tasks and background S3 jobs...")

    from services.redis_service import dequeue_background_job

    while not shutdown_requested:
        try:
            # Poll for indexing task first (with 1 second timeout)
            task = dequeue_indexing_task(timeout=1)
            if task is not None:
                repo_path = task.get("repo_path")
                repo_id = task.get("repo_id")
                user_id = task.get("user_id")

                print(
                    f"[Worker] Picked up indexing task for repository: {repo_path} (ID: {repo_id})"
                )
                process_indexing_task(repo_path, repo_id, user_id)
                continue

            # Poll for S3 background jobs
            job = dequeue_background_job(timeout=1)
            if job is not None:
                print(f"[Worker] Picked up background job: {job.get('job_type')}")
                process_background_job(job)
                continue

        except Exception as err:
            print(f"[Worker] Loop error: {err}")
            time.sleep(1)

    print("[Worker] Worker exited cleanly. Goodbye!")


def process_indexing_task(repo_path: str, repo_id: str, user_id: str):
    try:
        # Initialize progress state
        initial_status = {
            "progress": 0,
            "stage": "Queued",
            "message": "Starting background indexing...",
            "completed": False,
            "failed": False,
        }
        update_indexing_progress(repo_path, initial_status)
        update_repository_status(repo_id, "indexing")

        # Run indexing generator
        for step in index_repository_generator(repo_path):
            if shutdown_requested:
                print(
                    f"[Worker] Task aborted mid-run due to worker shutdown: {repo_path}"
                )
                abort_status = {
                    "progress": 50,
                    "stage": "Failed",
                    "message": "Indexing aborted due to worker restart.",
                    "completed": False,
                    "failed": True,
                }
                update_indexing_progress(repo_path, abort_status)
                update_repository_status(repo_id, "failed")
                return

            stage = step["stage"]
            percent = step["progress"]
            msg = step["message"]

            status_update = {
                "progress": percent,
                "stage": stage,
                "message": msg,
                "completed": stage == "Completed",
                "failed": stage == "Failed",
            }

            if stage == "Completed":
                data_metrics = step.get("data", {})
                status_update["data"] = data_metrics
                update_repository_status(
                    repo_id=repo_id,
                    status="completed",
                    files_indexed=data_metrics.get("files_indexed", 0),
                    chunks_indexed=data_metrics.get("chunks_indexed", 0),
                )
                # Build semantic knowledge graph
                print(
                    f"[Worker] Indexing complete. Building knowledge graph for {repo_path}..."
                )
                try:
                    build_knowledge_graph(repo_path, repo_id)
                    print(
                        f"[Worker] Knowledge graph successfully built for {repo_path}."
                    )
                except Exception as graph_err:
                    print(f"[Worker] Failed to build knowledge graph: {graph_err}")

            elif stage == "Failed":
                update_repository_status(repo_id=repo_id, status="failed")

            update_indexing_progress(repo_path, status_update)

    except Exception as e:
        print(f"[Worker] Failed processing task {repo_path}: {e}")
        fail_status = {
            "progress": 100,
            "stage": "Failed",
            "message": f"Error: {str(e)}",
            "completed": False,
            "failed": True,
        }
        update_indexing_progress(repo_path, fail_status)
        update_repository_status(repo_id, status="failed")


def process_background_job(job: dict):
    """Processes background tasks dequeued from Redis background jobs queue."""
    job_type = job.get("job_type")
    payload = job.get("payload", {})

    if job_type == "archive_and_upload":
        path = payload.get("path")
        repo_name = payload.get("repo_name")
        repo_url = payload.get("repo_url", "")
        repo_id = payload.get("repo_id")

        print(f"[Worker] Archiving and uploading repository {repo_name} to S3...")
        from services.repo_service import archive_and_upload_repo
        
        success = archive_and_upload_repo(path, repo_name, repo_url=repo_url, repo_id=repo_id)
        if success:
            print(f"[Worker] Repository {repo_name} successfully uploaded to S3.")
        else:
            print(f"[Worker] Failed to upload repository {repo_name} to S3.")


if __name__ == "__main__":
    run_worker()
