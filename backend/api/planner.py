from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.planner.task_planner import create_implementation_plan
from services.planner.task_executor import execute_plan_step

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
def plan_feature_implementation(payload: PlanPayload):
    """Generates a complete multi-file implementation plan for a user feature request."""
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Request message cannot be empty")

    try:
        plan = create_implementation_plan(payload.repo_path, payload.message)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute-step")
def execute_single_plan_step(payload: ExecuteStepPayload):
    """Generates code patches, test suites, and audits for a planned task step."""
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
