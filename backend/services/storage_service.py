import os
import boto3
import hashlib
from botocore.config import Config
from botocore.exceptions import ClientError
from settings import get_settings

settings = get_settings()


def get_s3_client():
    """Initializes and returns a boto3 S3 client."""
    try:
        s3_client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )
        return s3_client
    except Exception as e:
        print(f"[Storage Service] Error initializing S3 client: {e}")
        return None


def ensure_bucket_exists() -> bool:
    """Checks if the default bucket exists, creating it if necessary."""
    client = get_s3_client()
    if client is None:
        return False

    bucket = settings.s3_bucket_name
    try:
        client.head_bucket(Bucket=bucket)
        return True
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code in ["404", "NoSuchBucket"]:
            try:
                client.create_bucket(Bucket=bucket)
                print(f"[Storage Service] Successfully created S3 bucket: {bucket}")
                return True
            except Exception as create_err:
                print(
                    f"[Storage Service] Failed to create bucket {bucket}: {create_err}"
                )
                return False
        else:
            print(f"[Storage Service] Error checking bucket {bucket}: {e}")
            return False
    except Exception as err:
        print(
            f"[Storage Service] General connection check failed for bucket {bucket}: {err}"
        )
        return False


def calculate_sha256(file_path: str) -> str:
    """Calculates the SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def upload_file(
    local_path: str, s3_key: str, bucket_name: str = None, metadata: dict = None
) -> bool:
    """Uploads a local file to S3 with metadata and Server-Side Encryption."""
    client = get_s3_client()
    if client is None:
        return False

    bucket = bucket_name or settings.s3_bucket_name
    if not os.path.exists(local_path):
        print(
            f"[Storage Service] Upload failed: Local file does not exist at {local_path}"
        )
        return False

    # Calculate SHA-256 checksum and append to metadata
    try:
        file_hash = calculate_sha256(local_path)
        if metadata is None:
            metadata = {}
        metadata["sha256"] = file_hash
    except Exception as hash_err:
        print(f"[Storage Service] Checksum calculation failed: {hash_err}")

    # Set up S3 ExtraArgs
    extra_args = {"ServerSideEncryption": "AES256"}
    if metadata:
        extra_args["Metadata"] = metadata

    try:
        client.upload_file(local_path, bucket, s3_key, ExtraArgs=extra_args)
        return True
    except Exception as e:
        print(f"[Storage Service] Failed to upload {local_path} to {s3_key}: {e}")
        return False


def download_file(s3_key: str, local_path: str, bucket_name: str = None) -> bool:
    """Downloads a file object from S3 to local path and verifies SHA-256 checksum."""
    client = get_s3_client()
    if client is None:
        return False

    bucket = bucket_name or settings.s3_bucket_name
    local_dir = os.path.dirname(local_path)
    if local_dir:
        os.makedirs(local_dir, exist_ok=True)

    try:
        client.download_file(bucket, s3_key, local_path)
    except Exception as e:
        print(f"[Storage Service] Failed to download {s3_key} to {local_path}: {e}")
        return False

    # Verify checksum integrity
    try:
        response = client.head_object(Bucket=bucket, Key=s3_key)
        s3_metadata = response.get("Metadata", {})
        expected_hash = s3_metadata.get("sha256")

        if expected_hash:
            downloaded_hash = calculate_sha256(local_path)
            if downloaded_hash != expected_hash:
                print(
                    f"[Storage Service] Checksum mismatch for {s3_key}! Expected {expected_hash}, got {downloaded_hash}"
                )
                if os.path.exists(local_path):
                    os.remove(local_path)
                return False
            print(f"[Storage Service] Checksum matches for {s3_key}")
    except Exception as verify_err:
        print(
            f"[Storage Service] Verification failed/skipped for {s3_key}: {verify_err}"
        )

    return True


def generate_presigned_url(
    s3_key: str, expiration: int = 3600, bucket_name: str = None
) -> str | None:
    """Generates a presigned URL to retrieve/download an S3 object directly."""
    client = get_s3_client()
    if client is None:
        return None

    bucket = bucket_name or settings.s3_bucket_name
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": s3_key},
            ExpiresIn=expiration,
        )
        return url
    except Exception as e:
        print(f"[Storage Service] Failed to generate presigned URL for {s3_key}: {e}")
        return None


def delete_file(s3_key: str, bucket_name: str = None) -> bool:
    """Removes an object from S3."""
    client = get_s3_client()
    if client is None:
        return False

    bucket = bucket_name or settings.s3_bucket_name
    try:
        client.delete_object(Bucket=bucket, Key=s3_key)
        return True
    except Exception as e:
        print(f"[Storage Service] Failed to delete S3 key {s3_key}: {e}")
        return False


def list_files(prefix: str = "", bucket_name: str = None) -> list[str]:
    """Lists keys inside an S3 bucket matching a prefix."""
    client = get_s3_client()
    if client is None:
        return []

    bucket = bucket_name or settings.s3_bucket_name
    try:
        response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        contents = response.get("Contents", [])
        return [item["Key"] for item in contents]
    except Exception as e:
        print(f"[Storage Service] Failed to list S3 objects for prefix '{prefix}': {e}")
        return []


def get_latest_version_key(repo_name: str, bucket_name: str = None) -> str | None:
    """Finds the S3 key of the most recently uploaded archive version for a repository."""
    client = get_s3_client()
    if client is None:
        return None

    bucket = bucket_name or settings.s3_bucket_name
    prefix = f"repositories/{repo_name}/"
    try:
        response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        contents = response.get("Contents", [])
        if not contents:
            return None
        # Sort by LastModified descending
        sorted_contents = sorted(
            contents, key=lambda x: x["LastModified"], reverse=True
        )
        return sorted_contents[0]["Key"]
    except Exception as e:
        print(
            f"[Storage Service] Failed to find latest version key for {repo_name}: {e}"
        )
        return None


def prune_old_archives(repo_name: str, limit: int = 10, bucket_name: str = None):
    """Retains only the latest N versions of repository archives, deleting older ones."""
    client = get_s3_client()
    if client is None:
        return

    bucket = bucket_name or settings.s3_bucket_name
    prefix = f"repositories/{repo_name}/"
    try:
        response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
        contents = response.get("Contents", [])
        if len(contents) > limit:
            # Sort by LastModified ascending (oldest first)
            sorted_contents = sorted(contents, key=lambda x: x["LastModified"])
            excess_count = len(sorted_contents) - limit
            for item in sorted_contents[:excess_count]:
                client.delete_object(Bucket=bucket, Key=item["Key"])
                print(f"[Storage Service] Pruned old archive version: {item['Key']}")
    except Exception as e:
        print(f"[Storage Service] Failed to prune old archives for {repo_name}: {e}")
