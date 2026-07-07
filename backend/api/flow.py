from fastapi import APIRouter, Depends
from api.schemas import RepositoryPathRequest
from services.flow_explainer_service import explain_flow
from services.auth_validation import require_repo_read

router = APIRouter()


@router.post("/flow")
def flow(payload: RepositoryPathRequest, repo: dict = Depends(require_repo_read)):
    return explain_flow(repo["repository_path"])
