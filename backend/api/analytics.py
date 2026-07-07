from fastapi import APIRouter, Depends
from services.analytics_service import get_repository_analytics
from services.auth_validation import require_repo_read

router = APIRouter()


@router.get("/analytics")
def get_analytics(repo: dict = Depends(require_repo_read)):
    return get_repository_analytics(repo["repository_path"])
