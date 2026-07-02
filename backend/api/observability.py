from fastapi import APIRouter
from services.observability_service import get_telemetry_metrics

router = APIRouter()


@router.get("/metrics")
def get_metrics():
    """Endpoint that returns system logging metrics and diagnostics."""
    return get_telemetry_metrics()
