from fastapi import APIRouter, Depends
from api.schemas import RepositoryPathRequest
from services.architecture_ai_service import explain_architecture
from services.auth_validation import require_repo_read

router = APIRouter()


@router.post("/architecture")
def architecture(payload: RepositoryPathRequest, repo: dict = Depends(require_repo_read)):
    return explain_architecture(repo["repository_path"])
