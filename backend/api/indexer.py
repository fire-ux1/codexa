from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import os
import uuid

from api.schemas import RepositoryPathRequest
from services.indexing_service import index_repository, index_repository_generator
from services.auth_service import get_user_id_from_token
from services.db_service import (
    create_repository,
    update_repository_status,
    get_repositories_for_user,
)

router = APIRouter()


@router.post("/index")
def index_repo(payload: RepositoryPathRequest):

    result = index_repository(payload.repo_path)

    return result


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
            update_repository_status(repo_id, "indexing")
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

        # Run generator and stream progress
        for step in index_repository_generator(repo_path):
            stage = step["stage"]
            if stage == "Completed":
                data_metrics = step.get("data", {})
                update_repository_status(
                    repo_id=repo_id,
                    status="completed",
                    files_indexed=data_metrics.get("files_indexed", 0),
                    chunks_indexed=data_metrics.get("chunks_indexed", 0),
                )
            elif stage == "Failed":
                update_repository_status(repo_id=repo_id, status="failed")

            await websocket.send_json(step)
            # Short sleep to make progress transition smooth
            await asyncio.sleep(0.02)

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
