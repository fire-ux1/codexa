from fastapi import APIRouter
from api.schemas import RepositoryPathRequest
from services.review_service import review_repository

router = APIRouter()


@router.post("/repository")
def review(payload: RepositoryPathRequest):
    return review_repository(payload.repo_path)

