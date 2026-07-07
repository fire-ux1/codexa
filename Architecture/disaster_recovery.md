# CodePilot AI — Disaster Recovery Procedures

This document defines operations and processes to recover from storage, queue, or checksum failures in production environments.

---

## 1. Rebuilding Local Repository Cache from S3
If a local directory inside `backend/repos/` gets corrupted or deleted, the system automatically pulls the latest backup from S3 during the clone request. To trigger a manual rebuild:
1. Stop the worker process.
2. Remove the local folder:
   ```bash
   rm -rf backend/repos/{repository_name}
   ```
3. Restart the worker.
4. Send a `/clone` API request for the repository. The service will check S3, download the latest versioned ZIP, verify its SHA-256 integrity, and extract it locally.

---

## 2. Re-indexing Repositories
If the SQLite/Postgres database gets wiped or is out of sync with the files:
1. Trigger a fresh index request via:
   ```bash
   POST /indexer/index
   {
     "repo_path": "repos/{repository_name}"
   }
   ```
2. The distributed worker will dequeue the task, set state to `indexing`, parse all codebase files, save nodes/edges, and generate a new semantic knowledge graph.

---

## 3. Resolving Checksum Mismatches
When downloading archives from S3, the system verifies the SHA-256 checksum against the manifest file and object metadata:
1. If a mismatch is detected, the download is rejected and local files are removed.
2. Log: `event=restore_complete checksum_mismatch`
3. Action:
   - Identify the correct git commit.
   - Delete the corrupted S3 object version.
   - Re-run cloning locally and allow the background worker to re-upload a healthy version.

---

## 4. Recovering Interrupted Uploads / Cleanups
- **Redis Locks**: If a worker crashes mid-upload, the distributed Redis lock (`lock:repo:{repo_name}`) will automatically expire in 5 minutes (300s).
- **Cleanup Retention**: The backend automatically runs `prune_old_archives` on every upload, deleting old keys beyond the latest 10.
