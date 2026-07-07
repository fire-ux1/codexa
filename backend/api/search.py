from fastapi import APIRouter, Depends
from services.search_service import search_codebase
from api.auth import get_current_user_id
from services.auth_validation import verify_repo_access

router = APIRouter()


@router.get("/search")
def search(
    query: str, repo_path: str = None, user_id: str = Depends(get_current_user_id)
):
    if repo_path:
        verify_repo_access(repo_path, user_id)
    results = search_codebase(query, repo_path)
    return results
