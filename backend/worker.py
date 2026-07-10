"""
CodePilot AI — Celery Worker Entry Point

Previously this file contained a manual Redis blpop polling loop.
It has been migrated to Celery. This shim starts the Celery worker
process and is invoked by docker-compose via:

    celery -A celery_app worker --loglevel=info -Q indexing,default --concurrency=4

Or run directly:
    python worker.py
"""

import sys
import os

# Ensure the backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from celery_app import app  # noqa: F401 — imported so tasks are auto-discovered

if __name__ == "__main__":
    print("[Worker] Starting CodePilot AI Celery worker...")
    app.worker_main(
        argv=[
            "worker",
            "--loglevel=info",
            "-Q",
            "indexing,default",
            "--concurrency=4",
            "--hostname=codepilot-worker@%h",
        ]
    )
