"""
CodePilot AI — Celery Tasks
Contains all Celery task definitions migrated from the old worker.py polling loop.
"""

import sys
import os

# Ensure the backend root is on sys.path when Celery imports this module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from celery_app import app
from services.db_service import update_repository_status
from services.indexing_service import index_repository_generator
from services.knowledge_graph.graph_builder import build_knowledge_graph
from services.redis_service import update_indexing_progress
from services.observability_service import log_event


# ── Repository Indexing Task ───────────────────────────────────────────────────


@app.task(
    bind=True,
    name="tasks.indexing_tasks.index_repository_task",
    queue="indexing",
    max_retries=2,
    default_retry_delay=10,
    acks_late=True,
)
def index_repository_task(self, repo_path: str, repo_id: str, user_id: str):
    """
    Celery task: fully index a repository.
    Replaces process_indexing_task() from the old worker.py polling loop.
    Progress is published to Redis so the WebSocket progress stream can read it.
    """
    print(
        f"[Celery:indexing] Starting index for {repo_path} "
        f"(repo_id={repo_id}, task_id={self.request.id})"
    )

    # Initialise progress state in Redis
    initial_status = {
        "progress": 0,
        "stage": "Queued",
        "message": "Celery worker picked up task...",
        "completed": False,
        "failed": False,
        "celery_task_id": self.request.id,
    }
    update_indexing_progress(repo_path, initial_status)
    update_repository_status(repo_id, "indexing")

    try:
        for step in index_repository_generator(repo_path):
            stage = step["stage"]
            percent = step["progress"]
            msg = step["message"]

            status_update = {
                "progress": percent,
                "stage": stage,
                "message": msg,
                "completed": stage == "Completed",
                "failed": stage == "Failed",
                "celery_task_id": self.request.id,
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
                # Build semantic knowledge graph after indexing
                print(
                    f"[Celery:indexing] Indexing complete. Building knowledge graph for {repo_path}..."
                )
                try:
                    build_knowledge_graph(repo_path, repo_id)
                    print(f"[Celery:indexing] Knowledge graph built for {repo_path}.")
                except Exception as graph_err:
                    print(
                        f"[Celery:indexing] Failed to build knowledge graph: {graph_err}"
                    )

            elif stage == "Failed":
                update_repository_status(repo_id=repo_id, status="failed")

            update_indexing_progress(repo_path, status_update)

        log_event("index_completed", success=True)
        print(f"[Celery:indexing] Task finished successfully for {repo_path}.")

    except Exception as exc:
        print(f"[Celery:indexing] Task failed for {repo_path}: {exc}")

        fail_status = {
            "progress": 100,
            "stage": "Failed",
            "message": f"Error: {str(exc)}",
            "completed": False,
            "failed": True,
            "celery_task_id": self.request.id,
        }
        update_indexing_progress(repo_path, fail_status)
        update_repository_status(repo_id, status="failed")
        log_event("index_failed", success=False, error_message=str(exc))

        # Retry on transient errors (up to max_retries)
        raise self.retry(exc=exc, countdown=10)


# ── S3 Archive & Upload Task ───────────────────────────────────────────────────


@app.task(
    bind=True,
    name="tasks.indexing_tasks.archive_and_upload_task",
    queue="default",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def archive_and_upload_task(
    self,
    path: str,
    repo_name: str,
    repo_url: str = "",
    repo_id: str = "",
):
    """
    Celery task: archive a repository directory and upload it to S3/MinIO.
    Replaces process_background_job('archive_and_upload') from the old worker.py.
    """
    print(
        f"[Celery:default] Archiving and uploading {repo_name} to S3 (task_id={self.request.id})"
    )

    try:
        from services.repo_service import archive_and_upload_repo

        success = archive_and_upload_repo(
            path, repo_name, repo_url=repo_url, repo_id=repo_id
        )
        if success:
            print(
                f"[Celery:default] Repository {repo_name} uploaded to S3 successfully."
            )
        else:
            raise RuntimeError(
                f"archive_and_upload_repo returned False for {repo_name}"
            )

    except Exception as exc:
        print(f"[Celery:default] Upload task failed for {repo_name}: {exc}")
        raise self.retry(exc=exc, countdown=30)
