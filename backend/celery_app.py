"""
CodePilot AI — Celery Application
Central Celery instance used by the API (to enqueue tasks) and the
worker process (to consume & execute tasks).
"""

from celery import Celery
from settings import get_settings

settings = get_settings()

app = Celery(
    "codepilot",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "tasks.indexing_tasks",
    ],
)

# ── OpenTelemetry Instrumentation ─────────────────────────────────────────────
try:
    from observability.instrumentation import instrument_celery

    instrument_celery()
except Exception as e:
    print(f"[Celery Startup] OTEL instrumentation failed: {e}")

# ── Celery Configuration ──────────────────────────────────────────────────────
app.conf.update(
    # Serialisation
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Reliability
    task_acks_late=True,  # ACK after execution — safe for crashes
    task_reject_on_worker_lost=True,
    task_track_started=True,  # Expose STARTED state via result backend
    # Result TTL — keep task results for 24 h
    result_expires=86400,
    # Named queues
    task_default_queue="default",
    task_queues={
        "indexing": {
            "exchange": "indexing",
            "routing_key": "indexing",
        },
        "default": {
            "exchange": "default",
            "routing_key": "default",
        },
    },
    # Route tasks to specific queues
    task_routes={
        "tasks.indexing_tasks.index_repository_task": {"queue": "indexing"},
        "tasks.indexing_tasks.archive_and_upload_task": {"queue": "default"},
    },
    # Worker tuning
    worker_prefetch_multiplier=1,  # Fetch one task at a time (fair dispatch)
    worker_max_tasks_per_child=50,  # Recycle worker after 50 tasks (prevent memory leaks)
)


if __name__ == "__main__":
    app.start()
