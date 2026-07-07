from fastapi import APIRouter, HTTPException, Depends
import os
import shutil

from api.auth import get_current_user_id
from services.db_service import (
    delete_repository,
)
from services.auth_validation import (
    get_authorized_repositories_for_user,
    verify_repo_access,
    verify_repo_write_access,
)
from vector_store.qdrant_service import delete_collection, get_collection_name_for_path

router = APIRouter()


@router.get("")
def list_repositories(user_id: str = Depends(get_current_user_id)):
    """Retrieve history of all indexed repositories for the authenticated user."""
    return get_authorized_repositories_for_user(user_id)


@router.get("/{repo_id}")
def fetch_repository_details(repo_id: str, user_id: str = Depends(get_current_user_id)):
    """Fetch details of a single indexed repository."""
    return verify_repo_access(repo_id, user_id)


@router.delete("/{repo_id}")
def delete_repository_index(repo_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a repository index: deletes database record, vector collection, and local folder."""
    repo = verify_repo_write_access(repo_id, user_id)

    # 1. Delete vector collection
    collection_name = get_collection_name_for_path(repo["repository_path"])
    delete_collection(collection_name)

    # 2. Delete local folder on disk (if it exists under repos/)
    repo_path = repo["repository_path"]
    abs_path = os.path.abspath(repo_path)
    abs_repos = os.path.abspath("repos")

    if abs_path.startswith(abs_repos) and os.path.exists(abs_path):
        try:
            shutil.rmtree(abs_path)
        except Exception as e:
            print(f"Error deleting folder {abs_path}: {e}")

    # 3. Delete database record
    delete_repository(repo_id)

    from services.audit_service import log_audit_event
    log_audit_event(
        user_id=user_id,
        action="delete_repository",
        details={"repo_id": repo_id, "path": repo["repository_path"]}
    )

    return {"status": "success", "message": "Repository index deleted successfully."}
