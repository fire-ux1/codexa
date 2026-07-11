import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from api.auth import get_current_user_id
from services.auth_validation import verify_repo_access
from services.db_service import create_report, get_reports_by_repo, get_report
from services.report_service import generate_report_file
from services.storage_service import upload_file, download_file
from services.audit_service import log_audit_event
from settings import get_settings

router = APIRouter()
settings = get_settings()


class GenerateReportRequest(BaseModel):
    repository_id: str
    report_type: str  # "pdf" or "markdown"


@router.post("/generate")
def generate_compliance_report(
    payload: GenerateReportRequest,
    user_id: str = Depends(get_current_user_id),
):
    # Verify user has access to the repository
    repo = verify_repo_access(payload.repository_id, user_id)
    repo_id = repo["id"]
    repo_name = repo["repository_name"]

    if payload.report_type.lower() not in ["pdf", "markdown"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported report type. Supported types: 'pdf', 'markdown'.",
        )

    try:
        # 1. Compile report locally
        local_path, file_name, file_size = generate_report_file(
            repo_id, payload.report_type
        )

        # 2. Upload to S3/MinIO
        s3_key = f"reports/{repo_name}/{file_name}"
        success = upload_file(local_path, s3_key)
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to upload generated report to storage.",
            )

        # 3. Save to database
        report_id = str(uuid.uuid4())
        create_report(
            report_id=report_id,
            repository_id=repo_id,
            name=file_name,
            report_type=payload.report_type.lower(),
            s3_key=s3_key,
            file_size=file_size,
        )

        # 4. Log audit event
        log_audit_event(
            user_id=user_id,
            action="generate_report",
            details={
                "report_id": report_id,
                "repository_id": repo_id,
                "name": file_name,
                "type": payload.report_type,
            },
        )

        # 5. Clean up local temp report file
        if os.path.exists(local_path):
            os.remove(local_path)

        return {
            "status": "success",
            "report": {
                "id": report_id,
                "repository_id": repo_id,
                "name": file_name,
                "report_type": payload.report_type,
                "file_size": file_size,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_reports_history(
    repository_id: str,
    user_id: str = Depends(get_current_user_id),
):
    # Verify user has access
    repo = verify_repo_access(repository_id, user_id)
    repo_id = repo["id"]

    reports = get_reports_by_repo(repo_id)
    # Format datetimes
    formatted = []
    for r in reports:
        d = dict(r)
        if hasattr(d["created_at"], "isoformat"):
            d["created_at"] = d["created_at"].isoformat() + "Z"
        else:
            d["created_at"] = str(d["created_at"])
        formatted.append(d)
    return formatted


@router.get("/{report_id}/download")
def download_compliance_report(
    report_id: str,
    user_id: str = Depends(get_current_user_id),
):
    report = get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Verify user has access to repo
    verify_repo_access(report["repository_id"], user_id)

    # Local temp download path
    os.makedirs("temp_reports_download", exist_ok=True)
    local_path = os.path.join("temp_reports_download", report["name"])

    # Download from S3/MinIO
    success = download_file(report["s3_key"], local_path)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve report file from storage.",
        )

    # Return FileResponse (which handles streaming and client downloads)
    media_type = (
        "application/pdf" if report["report_type"] == "pdf" else "text/markdown"
    )
    return FileResponse(
        local_path,
        media_type=media_type,
        filename=report["name"],
    )
