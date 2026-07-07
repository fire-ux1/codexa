from fastapi import APIRouter, Depends
from api.schemas import RepositoryPathRequest
from services.review_service import review_repository
from services.auth_validation import require_repo_read

router = APIRouter()


@router.post("/repository")
def review(payload: RepositoryPathRequest, repo: dict = Depends(require_repo_read)):
    return review_repository(repo["repository_path"])
