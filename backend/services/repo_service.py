from datetime import datetime
from git import Repo
import json
import logging
import os
import shutil
import time
import uuid
from services.db_service import (
    create_repository,
    update_repository_status,
    get_repositories_for_user,
)
from services.storage_service import (
    upload_file,
    download_file,
    get_latest_version_key,
    prune_old_archives,
    generate_presigned_url,
)
from services.redis_service import acquire_repo_lock, release_repo_lock

logger = logging.getLogger("repo_service")

CLONE_DIR = "repos"
ARCHIVE_DIR = os.path.join(CLONE_DIR, "archives")

# Shared repository storage operational metrics for Prometheus
storage_metrics = {
    "uploads": 0,
    "downloads": 0,
    "upload_latency_sum": 0.0,
    "restore_duration_sum": 0.0,
    "last_compression_ratio": 1.0,
}


def get_dir_file_count_and_size(path: str) -> tuple[int, int]:
    """Calculates both the file count and total size in bytes of a directory."""
    count = 0
    total = 0
    if not os.path.exists(path):
        return 0, 0
    for root, _, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            try:
                if os.path.exists(fp):
                    total += os.path.getsize(fp)
                    count += 1
            except Exception:
                pass
    return count, total


def archive_and_upload_repo(
    repo_path: str, repo_name: str, repo_url: str = "", repo_id: str = None
) -> bool:
    """Helper to compress local repository directory, gather Git metadata, upload to S3, and prune old files."""
    try:
        os.makedirs(ARCHIVE_DIR, exist_ok=True)
        archive_base = os.path.join(ARCHIVE_DIR, f"{repo_name}_{int(time.time())}")

        if repo_id:
            update_repository_status(repo_id, "uploading")

        commit_sha = "unknown"
        branch_name = "unknown"
        try:
            repo = Repo(repo_path)
            commit_sha = repo.head.commit.hexsha
            branch_name = repo.active_branch.name
        except Exception:
            pass

        # 1. Capture Compression Metrics
        file_count, original_size = get_dir_file_count_and_size(repo_path)
        compress_start = time.time()
        try:
            zip_path = shutil.make_archive(archive_base, "zip", repo_path)
            compress_duration = time.time() - compress_start

            compressed_size = os.path.getsize(zip_path)
            ratio = (compressed_size / original_size) if original_size > 0 else 1.0

            # Versioned naming structure
            timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
            s3_key = f"repositories/{repo_name}/commit_{commit_sha}_{timestamp}.zip"
            manifest_key = f"repositories/{repo_name}/commit_{commit_sha}_{timestamp}.manifest.json"

            metadata = {
                "repository_url": repo_url or repo_name,
                "branch": branch_name,
                "commit_sha": commit_sha,
                "upload_timestamp": datetime.utcnow().isoformat() + "Z",
                "archive_version": "1.0",
            }

            # 2. Capture Upload Metrics
            upload_start = time.time()
            success = upload_file(zip_path, s3_key, metadata=metadata)
            upload_duration = time.time() - upload_start

            # Calculate file hash
            from services.storage_service import calculate_sha256

            file_hash = "unknown"
            if os.path.exists(zip_path):
                file_hash = calculate_sha256(zip_path)

            # Cleanup local ZIP file
            if os.path.exists(zip_path):
                os.remove(zip_path)

            if success:
                # 3. Create & Upload Manifest File (Step 2)
                manifest_data = {
                    "repository": repo_name,
                    "branch": branch_name,
                    "commit": commit_sha,
                    "created_at": datetime.utcnow().isoformat() + "Z",
                    "archive_version": 3,
                    "file_count": file_count,
                    "compressed_size": compressed_size,
                    "sha256": file_hash,
                }
                manifest_path = zip_path + ".manifest.json"
                try:
                    with open(manifest_path, "w", encoding="utf-8") as mf:
                        json.dump(manifest_data, mf, indent=2)
                    upload_file(manifest_path, manifest_key)
                except Exception as manifest_err:
                    logger.error(
                        f"event=manifest_creation_failed repo={repo_name} error={manifest_err}"
                    )
                finally:
                    if os.path.exists(manifest_path):
                        os.remove(manifest_path)

                logger.info(
                    f"event=archive_uploaded repo={repo_name} "
                    f"original_size={original_size} compressed_size={compressed_size} "
                    f"ratio={ratio:.4f} compress_time={compress_duration:.3f}s "
                    f"upload_time={upload_duration:.3f}s key={s3_key}"
                )

                # Record metrics for Prometheus
                storage_metrics["uploads"] += 1
                storage_metrics["upload_latency_sum"] += upload_duration
                storage_metrics["last_compression_ratio"] = ratio

                if repo_id:
                    update_repository_status(repo_id, "uploaded")

                # 4. Apply Cleanup Policy (retention limit 10)
                prune_old_archives(repo_name, limit=10)
            else:
                logger.error(f"event=archive_upload_failed repo={repo_name}")
                if repo_id:
                    update_repository_status(repo_id, "failed")

            return success
        except Exception as e:
            logger.error(f"event=archive_failed repo={repo_name} error='{str(e)}'")
            if repo_id:
                update_repository_status(repo_id, "failed")
            return False
    finally:
        release_repo_lock(repo_name)


def restore_repo_from_s3(
    repo_path: str, repo_name: str, repo_id: str = None, project_id: str = None
) -> bool:
    """Helper to locate, download, and extract the latest versioned repository archive from S3, broadcasting progress."""
    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    zip_path = os.path.join(ARCHIVE_DIR, f"{repo_name}_restoring.zip")

    if repo_id:
        update_repository_status(repo_id, "restoring")

    from services.event_bus import publish_event

    def broadcast_progress(stage: str, percent: int):
        if project_id:
            try:
                publish_event(
                    project_id,
                    "restore_progress",
                    {"stage": stage, "percent": percent},
                )
            except Exception:
                pass

    try:
        # Step 3: Broadcast restore_started (Step 3)
        broadcast_progress("started", 10)

        # Find the latest key from the versioned folder
        latest_key = get_latest_version_key(repo_name)
        if not latest_key:
            broadcast_progress("failed", 100)
            if repo_id:
                update_repository_status(repo_id, "failed")
            return False

        logger.info(f"event=restore_started repo={repo_name} key={latest_key}")

        broadcast_progress("downloading", 30)

        # Support pre-signed URL for direct download if desired (Step 2)
        presigned_url = generate_presigned_url(latest_key)
        if presigned_url:
            logger.info(
                f"event=presigned_url_generated repo={repo_name} url={presigned_url[:80]}..."
            )

        download_start = time.time()
        download_success = download_file(latest_key, zip_path)
        download_duration = time.time() - download_start

        if not download_success:
            logger.error(f"event=restore_download_failed repo={repo_name}")
            broadcast_progress("failed", 100)
            if repo_id:
                update_repository_status(repo_id, "failed")
            return False

        broadcast_progress("extracting", 70)

        # Extract
        restore_start = time.time()
        os.makedirs(repo_path, exist_ok=True)
        shutil.unpack_archive(zip_path, repo_path)
        restore_duration = time.time() - restore_start

        # Cleanup local restore zip
        if os.path.exists(zip_path):
            os.remove(zip_path)

        logger.info(
            f"event=restore_complete repo={repo_name} "
            f"download_time={download_duration:.3f}s restore_time={restore_duration:.3f}s"
        )

        # Record metrics for Prometheus
        storage_metrics["downloads"] += 1
        storage_metrics["restore_duration_sum"] += download_duration + restore_duration

        broadcast_progress("completed", 100)
        if repo_id:
            update_repository_status(repo_id, "uploaded")

        return True
    except Exception as e:
        logger.error(f"event=restore_failed repo={repo_name} error='{str(e)}'")
        broadcast_progress("failed", 100)
        if repo_id:
            update_repository_status(repo_id, "failed")
        if os.path.exists(zip_path):
            os.remove(zip_path)
        return False


def clone_repository(
    repo_url: str,
    user_id: str = "mock-dev",
    project_id: str = None,
    access_token: str = None,
):
    """Clones a repository locally, using S3 object storage cache as primary restore mechanism."""
    os.makedirs(CLONE_DIR, exist_ok=True)

    normalized_url = repo_url.replace("\\", "/").rstrip("/")
    repo_name = normalized_url.split("/")[-1].replace(".git", "")
    repo_path = os.path.join(CLONE_DIR, repo_name)

    if not acquire_repo_lock(repo_name):
        logger.warning(f"event=repo_lock_busy repo={repo_name}")
        raise RuntimeError(
            f"Repository {repo_name} is currently busy with another operation."
        )

    # Database lifecycle record initialization (Step 6)
    user_repos = get_repositories_for_user(user_id)
    repo_id = None
    for r in user_repos:
        if r["repository_path"] == repo_path:
            repo_id = r["id"]
            break

    if not repo_id:
        repo_id = str(uuid.uuid4())
        create_repository(
            repo_id=repo_id,
            user_id=user_id,
            name=repo_name,
            path=repo_path,
            branch="main",
            status="cloning",
        )
    else:
        update_repository_status(repo_id, "cloning")

    try:
        if os.path.exists(repo_path):
            if os.path.exists(os.path.join(repo_path, ".git")):
                # Lock remains held since background task will be scheduled
                return repo_path, repo_name, repo_id, True

            try:
                shutil.rmtree(repo_path)
            except Exception:
                pass

        # Try S3 restore
        if restore_repo_from_s3(
            repo_path, repo_name, repo_id=repo_id, project_id=project_id
        ):
            # No background task scheduled, release lock immediately
            release_repo_lock(repo_name)
            return repo_path, repo_name, repo_id, False

        logger.info(f"event=clone_git_fallback repo={repo_name} url={repo_url}")
        clone_url = repo_url
        if access_token:
            if repo_url.startswith("https://"):
                clone_url = repo_url.replace("https://", f"https://{access_token}@")
        Repo.clone_from(clone_url, repo_path)

        # Lock remains held for background S3 upload task
        return repo_path, repo_name, repo_id, True

    except Exception as e:
        # Release lock in case of errors before background task is scheduled
        release_repo_lock(repo_name)
        raise e
