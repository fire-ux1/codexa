from fastapi import APIRouter

from services.architecture_ai_service import (
    explain_architecture
)

router = APIRouter()


@router.post("/architecture")
def architecture(repo_path: str):

    return explain_architecture(repo_path)