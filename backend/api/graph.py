from fastapi import APIRouter, Depends
from services.repository_graph_service import generate_repository_graph
from services.auth_validation import require_repo_read

router = APIRouter()


@router.get("/graph")
def get_graph(repo: dict = Depends(require_repo_read)):
    return generate_repository_graph(repo["repository_path"])
