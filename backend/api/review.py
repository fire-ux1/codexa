from fastapi import APIRouter
from services.review_service import review_repository

router = APIRouter()

@router.post("/review")
def review(repo_path: str):
    return review_repository(repo_path)