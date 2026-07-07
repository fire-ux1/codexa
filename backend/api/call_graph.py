from fastapi import APIRouter, Depends
from api.schemas import RepositoryPathRequest
from services.repository_call_graph_service import build_repository_call_graph
from services.auth_validation import require_repo_read

router = APIRouter()


@router.post("/call-graph")
def call_graph(payload: RepositoryPathRequest, repo: dict = Depends(require_repo_read)):
    return build_repository_call_graph(repo["repository_path"])
