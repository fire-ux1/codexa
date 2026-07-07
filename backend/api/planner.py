from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.planner.task_planner import create_implementation_plan
from services.planner.task_executor import execute_plan_step
from api.auth import get_current_user_id
from services.auth_validation import verify_repo_write_access

router = APIRouter()


class PlanPayload(BaseModel):
    repo_path: str
    message: str


class ExecuteStepPayload(BaseModel):
    repo_path: str
    file_path: str
    action: str
    instruction: str


@router.post("/plan")
def plan_feature_implementation(
    payload: PlanPayload, user_id: str = Depends(get_current_user_id)
):
    """Generates a complete multi-file implementation plan for a user feature request."""
    # Write permission required for planning changes to repo
    verify_repo_write_access(payload.repo_path, user_id)

    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Request message cannot be empty")

    try:
        plan = create_implementation_plan(payload.repo_path, payload.message)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute-step")
def execute_single_plan_step(
    payload: ExecuteStepPayload, user_id: str = Depends(get_current_user_id)
):
    """Generates code patches, test suites, and audits for a planned task step."""
    # Write permission required for executing changes on repo
    verify_repo_write_access(payload.repo_path, user_id)

    try:
        result = execute_plan_step(
            repo_path=payload.repo_path,
            file_path=payload.file_path,
            action=payload.action,
            instruction=payload.instruction,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
