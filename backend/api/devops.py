from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.devops.devops_service import generate_devops_asset
from services.documentation.doc_generator import generate_doc_asset

router = APIRouter()


class DevOpsGeneratePayload(BaseModel):
    repo_path: str
    asset_type: str  # readme, api, architecture, dockerfile, docker-compose, github-actions, kubernetes, helm


@router.post("/generate")
def generate_devops_or_doc_asset(payload: DevOpsGeneratePayload):
    """Router to generate documentation pages or DevOps pipeline infrastructure assets."""
    a_type = payload.asset_type.lower()

    try:
        if a_type in {"readme", "api", "architecture"}:
            content = generate_doc_asset(payload.repo_path, a_type)
        elif a_type in {
            "dockerfile",
            "docker-compose",
            "github-actions",
            "kubernetes",
            "helm",
        }:
            content = generate_devops_asset(payload.repo_path, a_type)
        else:
            raise HTTPException(
                status_code=400, detail=f"Unsupported asset type: {payload.asset_type}"
            )

        return {
            "status": "success",
            "asset_type": payload.asset_type,
            "content": content,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
