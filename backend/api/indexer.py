from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import os
import uuid
import queue
import threading

from api.schemas import RepositoryPathRequest
from services.auth_service import get_user_id_from_token
from services.db_service import (
    create_repository,
    update_repository_status,
    get_repositories_for_user,
)

router = APIRouter()

# Global thread-safe queue and tracking dictionary for background indexing tasks
indexing_progress = {}  # {repo_path: {"progress": int, "stage": str, "message": str, "completed": bool, "failed": bool, "data": dict}}
task_queue = queue.Queue()


def background_indexer_worker():
    """Background worker that pulls indexing tasks and processes them sequentially."""
    while True:
        try:
            task = task_queue.get()
            if task is None:
                break
            repo_path, repo_id, user_id = task
            run_indexing(repo_path, repo_id, user_id)
            task_queue.task_done()
        except Exception as e:
            print(f"[Background Indexer Worker] Error: {e}")


def run_indexing(repo_path: str, repo_id: str, user_id: str):
    """Executes the repository indexing pipeline and updates global progress state."""
    try:
        from services.indexing_service import index_repository_generator

        indexing_progress[repo_path] = {
            "progress": 0,
            "stage": "Queued",
            "message": "Waiting in queue...",
            "completed": False,
            "failed": False
        }

        for step in index_repository_generator(repo_path):
            stage = step["stage"]
            percent = step["progress"]
            msg = step["message"]

            status_update = {
                "progress": percent,
                "stage": stage,
                "message": msg,
                "completed": stage == "Completed",
                "failed": stage == "Failed"
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
                try:
                    from services.knowledge_graph.graph_builder import (
                        build_knowledge_graph,
                    )
                    build_knowledge_graph(repo_path, repo_id)
                except Exception as graph_err:
                    print(f"Failed to build knowledge graph: {graph_err}")

            elif stage == "Failed":
                update_repository_status(repo_id=repo_id, status="failed")

            indexing_progress[repo_path] = status_update

    except Exception as e:
        print(f"[Background Indexer] Fail: {e}")
        indexing_progress[repo_path] = {
            "progress": 100,
            "stage": "Failed",
            "message": f"Error: {str(e)}",
            "completed": False,
            "failed": True
        }
        update_repository_status(repo_id=repo_id, status="failed")


# Start background indexing worker thread
worker_thread = threading.Thread(target=background_indexer_worker, daemon=True)
worker_thread.start()


@router.post("/index")
def index_repo(payload: RepositoryPathRequest):
    # Enqueue indexing dynamically via REST (for compatibility)
    repo_name = os.path.basename(payload.repo_path.replace("\\", "/").rstrip("/"))
    repo_id = str(uuid.uuid4())
    create_repository(
        repo_id=repo_id,
        user_id="mock-dev",
        name=repo_name,
        path=payload.repo_path,
        branch="main",
        status="indexing",
    )
    task_queue.put((payload.repo_path, repo_id, "mock-dev"))
    return {"status": "queued", "repo_id": repo_id}


@router.websocket("/progress")
async def websocket_indexer(websocket: WebSocket):
    await websocket.accept()
    try:
        # Receive setup payload
        data = await websocket.receive_json()
        repo_path = data.get("repo_path")

        if not repo_path:
            await websocket.send_json(
                {
                    "progress": 100,
                    "stage": "Failed",
                    "message": "Repository path is required.",
                }
            )
            await websocket.close()
            return

        # Authenticate via query token or use mock sandbox fallback
        token = websocket.query_params.get("token")
        user_id = None
        if token:
            user_id = get_user_id_from_token(token)
        if not user_id:
            user_id = "mock-dev"

        repo_name = os.path.basename(repo_path.replace("\\", "/").rstrip("/"))
        if not repo_name:
            repo_name = "unnamed-repo"

        # Check if repo already registered
        user_repos = get_repositories_for_user(user_id)
        existing_repo = None
        for r in user_repos:
            if r["repository_path"] == repo_path:
                existing_repo = r
                break

        if existing_repo:
            repo_id = existing_repo["id"]
        else:
            repo_id = str(uuid.uuid4())
            create_repository(
                repo_id=repo_id,
                user_id=user_id,
                name=repo_name,
                path=repo_path,
                branch="main",
                status="indexing",
            )

        # Check if task is already running in background
        is_active = repo_path in indexing_progress and not (
            indexing_progress[repo_path]["completed"] or indexing_progress[repo_path]["failed"]
        )

        if not is_active:
            update_repository_status(repo_id, "indexing")
            indexing_progress[repo_path] = {
                "progress": 0,
                "stage": "Queued",
                "message": "Adding task to queue...",
                "completed": False,
                "failed": False
            }
            task_queue.put((repo_path, repo_id, user_id))

        # Stream background progress status updates to the client
        last_progress = -1
        last_stage = ""

        while True:
            current_status = indexing_progress.get(repo_path)
            if not current_status:
                await asyncio.sleep(0.1)
                continue

            if (
                current_status["progress"] != last_progress
                or current_status["stage"] != last_stage
            ):
                await websocket.send_json(
                    {
                        "progress": current_status["progress"],
                        "stage": current_status["stage"],
                        "message": current_status["message"],
                    }
                )
                last_progress = current_status["progress"]
                last_stage = current_status["stage"]

            if current_status["completed"] or current_status["failed"]:
                break

            await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        print("Indexer WebSocket disconnected client-side.")
    except Exception as e:
        print(f"WS Indexer Error: {e}")
        try:
            await websocket.send_json(
                {"progress": 100, "stage": "Failed", "message": f"Error: {str(e)}"}
            )
        except Exception:
            pass
