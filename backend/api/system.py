from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from services.websocket_manager import manager

router = APIRouter()


@router.get("/system/websocket/metrics")
def get_websocket_metrics():
    """Returns WebSocket operational metrics for dashboard tracking."""
    return manager.get_metrics()


@router.get("/system/storage/health")
def get_storage_health():
    """Checks the health and reachability of the S3 object storage provider."""
    from services.storage_service import get_s3_client
    from settings import get_settings

    setts = get_settings()
    client = get_s3_client()

    if client is None:
        return {
            "status": "unhealthy",
            "provider": "MinIO",
            "bucket": setts.s3_bucket_name,
            "reachable": False,
        }

    try:
        client.head_bucket(Bucket=setts.s3_bucket_name)
        return {
            "status": "healthy",
            "provider": "MinIO",
            "bucket": setts.s3_bucket_name,
            "reachable": True,
        }
    except Exception:
        return {
            "status": "unhealthy",
            "provider": "MinIO",
            "bucket": setts.s3_bucket_name,
            "reachable": False,
        }


@router.get("/system/prometheus/metrics", response_class=PlainTextResponse)
def prometheus_metrics():
    """Returns system operational metrics in Prometheus exposition format."""
    ws_metrics = manager.get_metrics()
    from services.repo_service import storage_metrics

    lines = [
        "# HELP websocket_active_connections Active WebSocket connections",
        "# TYPE websocket_active_connections gauge",
        f"websocket_active_connections {ws_metrics['active_connections']}",
        "# HELP websocket_active_projects Active projects with WS",
        "# TYPE websocket_active_projects gauge",
        f"websocket_active_projects {ws_metrics['active_projects']}",
        "# HELP websocket_redis_listeners Active Redis Pub/Sub listeners",
        "# TYPE websocket_redis_listeners gauge",
        f"websocket_redis_listeners {ws_metrics['redis_listeners']}",
        "# HELP websocket_messages_sent_total Total messages sent over WS",
        "# TYPE websocket_messages_sent_total counter",
        f"websocket_messages_sent_total {ws_metrics['messages_sent']}",
        "# HELP websocket_failed_sends_total Total failed WS sends",
        "# TYPE websocket_failed_sends_total counter",
        f"websocket_failed_sends_total {ws_metrics['failed_sends']}",
        "# HELP s3_uploads_total Total number of S3 uploads",
        "# TYPE s3_uploads_total counter",
        f"s3_uploads_total {storage_metrics['uploads']}",
        "# HELP s3_downloads_total Total number of S3 downloads",
        "# TYPE s3_downloads_total counter",
        f"s3_downloads_total {storage_metrics['downloads']}",
        "# HELP s3_upload_latency_seconds_sum Sum of S3 upload latencies in seconds",
        "# TYPE s3_upload_latency_seconds_sum counter",
        f"s3_upload_latency_seconds_sum {storage_metrics['upload_latency_sum']:.4f}",
        "# HELP s3_restore_duration_seconds_sum Sum of S3 restore durations in seconds",
        "# TYPE s3_restore_duration_seconds_sum counter",
        f"s3_restore_duration_seconds_sum {storage_metrics['restore_duration_sum']:.4f}",
        "# HELP repository_compression_ratio Last compression ratio",
        "# TYPE repository_compression_ratio gauge",
        f"repository_compression_ratio {storage_metrics['last_compression_ratio']:.4f}",
    ]
    return "\n".join(lines) + "\n"
