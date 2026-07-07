import os
from settings import get_settings
from services.storage_service import (
    ensure_bucket_exists,
    upload_file,
    download_file,
    delete_file,
    list_files,
    get_s3_client,
)

settings = get_settings()


def test_storage_service_offline_or_online():
    client = get_s3_client()
    if client is None:
        print(
            "[Test Storage] S3/MinIO client could not be initialized. Skipping active test."
        )
        return

    try:
        client.list_buckets()
    except Exception:
        print("[Test Storage] S3/MinIO is unreachable. Skipping live S3 operations.")
        return

    assert ensure_bucket_exists() is True

    test_file = "test_s3_dummy.txt"
    test_content = "Hello CodePilot S3 Storage"

    with open(test_file, "w") as f:
        f.write(test_content)

    s3_key = "tests/dummy.txt"
    try:
        custom_metadata = {
            "repository_url": "https://github.com/dummy",
            "branch": "test-branch",
        }
        assert upload_file(test_file, s3_key, metadata=custom_metadata) is True

        files = list_files(prefix="tests/")
        assert s3_key in files

        # Download and verify checksum + metadata
        dest_file = "test_s3_downloaded.txt"
        assert download_file(s3_key, dest_file) is True

        with open(dest_file, "r") as f:
            content = f.read()
        assert content == test_content

        # Verify metadata retrieval
        bucket = settings.s3_bucket_name or "codepilot-storage"
        response = client.head_object(Bucket=bucket, Key=s3_key)
        meta = response.get("Metadata", {})
        assert meta.get("branch") == "test-branch"
        assert "sha256" in meta

        assert delete_file(s3_key) is True

        if os.path.exists(dest_file):
            os.remove(dest_file)

        # Verify retention policy pruning (latest 10 versions)
        from services.storage_service import prune_old_archives

        # Upload 12 versioned test keys
        test_keys = []
        for i in range(12):
            v_key = f"repositories/test-repo/version_{i}.zip"
            assert upload_file(test_file, v_key) is True
            test_keys.append(v_key)

        # Run prune
        prune_old_archives("test-repo", limit=10)

        # Check that we only have 10 keys remaining
        remaining_files = list_files(prefix="repositories/test-repo/")
        assert len(remaining_files) == 10

        # Delete all remaining versioned files
        for key in remaining_files:
            delete_file(key)

    finally:
        if os.path.exists(test_file):
            os.remove(test_file)
