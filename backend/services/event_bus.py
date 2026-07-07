from datetime import datetime
import json
import uuid
from services.redis_service import get_redis


def publish_event(project_id: str, event_type: str, payload: dict) -> bool:
    """Sends a standardized collaboration event envelope to the Redis Pub/Sub channel."""
    client = get_redis()
    if client is None:
        return False
    try:
        envelope = {
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "version": 1,
            "type": event_type,
            "project_id": project_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "payload": payload,
        }
        channel = f"project_events:{project_id}"
        client.publish(channel, json.dumps(envelope))
        return True
    except Exception as e:
        print(
            f"[EventBus] Failed to publish event {event_type} on project {project_id}: {e}"
        )
        return False


def publish_comment_added(project_id: str, comment: dict) -> bool:
    """Publishes a standardized comment_added event."""
    return publish_event(project_id, "comment_added", {"comment": comment})


def publish_comment_deleted(project_id: str, comment_id: str) -> bool:
    """Publishes a standardized comment_deleted event."""
    return publish_event(project_id, "comment_deleted", {"comment_id": comment_id})
