import json
import redis
from settings import get_settings

settings = get_settings()

redis_client = None


def get_redis():
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.Redis.from_url(
                settings.redis_url, decode_responses=True, socket_timeout=5
            )
            # Ping to verify connection
            redis_client.ping()
        except Exception as e:
            print(
                f"[Redis Connection Error] Failed to connect to Redis at {settings.redis_url}. "
                f"Ensure Redis is running (e.g. 'docker compose up -d'). Error: {e}"
            )
            redis_client = None
    return redis_client


def get_cached_response(prompt_hash: str) -> str:
    client = get_redis()
    if client is None:
        return None
    try:
        return client.get(f"llm_cache:{prompt_hash}")
    except Exception as e:
        print(f"[Redis Cache] Read error: {e}")
        return None


def set_cached_response(prompt_hash: str, response: str, expire_seconds: int = 86400):
    client = get_redis()
    if client is None:
        return
    try:
        client.setex(f"llm_cache:{prompt_hash}", expire_seconds, response)
    except Exception as e:
        print(f"[Redis Cache] Write error: {e}")


INDEXING_QUEUE_KEY = "indexing_queue"
INDEXING_PROGRESS_PREFIX = "indexing_progress:"


def enqueue_indexing_task(repo_path: str, repo_id: str, user_id: str) -> bool:
    client = get_redis()
    if client is None:
        return False
    try:
        task_data = {
            "repo_path": repo_path,
            "repo_id": repo_id,
            "user_id": user_id,
        }
        client.rpush(INDEXING_QUEUE_KEY, json.dumps(task_data))
        return True
    except Exception as e:
        print(f"[Redis Queue] Enqueue error: {e}")
        return False


def dequeue_indexing_task(timeout: int = 0) -> dict:
    client = get_redis()
    if client is None:
        import time

        time.sleep(1)
        return None
    try:
        res = client.blpop(INDEXING_QUEUE_KEY, timeout=timeout)
        if res:
            return json.loads(res[1])
        return None
    except Exception as e:
        print(f"[Redis Queue] Dequeue error: {e}")
        import time

        time.sleep(1)
        return None


def update_indexing_progress(repo_path: str, progress_data: dict) -> bool:
    client = get_redis()
    if client is None:
        return False
    try:
        key = f"{INDEXING_PROGRESS_PREFIX}{repo_path}"
        client.set(key, json.dumps(progress_data))
        client.expire(key, 604800)  # Keep progress state for 7 days
        return True
    except Exception as e:
        print(f"[Redis Queue] Progress update error: {e}")
        return False


def get_indexing_progress(repo_path: str) -> dict:
    client = get_redis()
    if client is None:
        return None
    try:
        key = f"{INDEXING_PROGRESS_PREFIX}{repo_path}"
        val = client.get(key)
        if val:
            return json.loads(val)
        return None
    except Exception as e:
        print(f"[Redis Queue] Get progress error: {e}")
        return None


BACKGROUND_JOBS_QUEUE = "background_jobs"


def enqueue_background_job(job_type: str, payload: dict) -> bool:
    """Enqueues a background task to the Redis-backed distributed queue."""
    client = get_redis()
    if client is None:
        return False
    try:
        job_data = {"job_type": job_type, "payload": payload}
        client.rpush(BACKGROUND_JOBS_QUEUE, json.dumps(job_data))
        return True
    except Exception as e:
        print(f"[Redis Queue] Enqueue background job error: {e}")
        return False


def dequeue_background_job(timeout: int = 0) -> dict:
    """Blocks and retrieves a background task from the Redis distributed queue."""
    client = get_redis()
    if client is None:
        return None
    try:
        res = client.blpop(BACKGROUND_JOBS_QUEUE, timeout=timeout)
        if res:
            return json.loads(res[1])
        return None
    except Exception as e:
        print(f"[Redis Queue] Dequeue background job error: {e}")
        return None


def acquire_repo_lock(repo_name: str, expire_seconds: int = 300) -> bool:
    """Acquires a distributed Redis lock to prevent concurrent S3/Git operations on the same repository."""
    client = get_redis()
    if client is None:
        return True  # Fallback: proceed if Redis is offline
    try:
        lock_key = f"lock:repo:{repo_name}"
        return bool(client.set(lock_key, "1", ex=expire_seconds, nx=True))
    except Exception as e:
        print(f"[Redis Lock] Failed to acquire lock for {repo_name}: {e}")
        return True


def release_repo_lock(repo_name: str):
    """Releases the distributed Redis lock for a repository."""
    client = get_redis()
    if client is None:
        return
    try:
        lock_key = f"lock:repo:{repo_name}"
        client.delete(lock_key)
    except Exception as e:
        print(f"[Redis Lock] Failed to release lock for {repo_name}: {e}")
