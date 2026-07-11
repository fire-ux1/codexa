"""
Unit tests for the PDF/Markdown compliance report generation pipeline.

Covers:
  - generate_report_file() service: PDF output, Markdown output, unsupported format
  - /reports/generate API endpoint (mocked DB/S3)
  - /reports/history API endpoint
  - /reports/{id}/download API endpoint
"""

import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helper: minimal FastAPI app with just the reports router mounted
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def client():
    from fastapi import FastAPI
    from api.reports import router as reports_router
    from api.reports import get_current_user_id

    app = FastAPI()
    app.include_router(reports_router, prefix="/reports")
    app.dependency_overrides[get_current_user_id] = lambda: "u-test-reporter"
    return TestClient(app, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# Tests: generate_report_file() service
# ---------------------------------------------------------------------------


class TestGenerateReportFile:
    """Tests for the low-level report_service.generate_report_file function."""

    def _mock_db_and_telemetry(self):
        """Returns a patcher context that stubs out all DB/telemetry calls."""
        mock_repo_row = {
            "id": "repo-test",
            "repository_name": "test-repo",
            "repository_path": "/repos/test-repo",
            "branch": "main",
            "files_indexed": 42,
            "chunks_indexed": 200,
            "indexed_at": "2025-01-01 00:00:00",
        }
        mock_telemetry = {
            "active_users": 3,
            "indexed_repositories": 5,
            "total_ai_requests": 120,
            "average_latency": 0.8,
            "error_rate": 0.5,
            "token_usage": 15000,
            "cache_hit_rate": 72.3,
        }
        mock_comp_row = {
            "hipaa_mode": True,
            "sox_mode": False,
            "retention_days": 90,
            "session_timeout": True,
            "slack_enabled": False,
            "jira_enabled": True,
            "github_ent_enabled": False,
        }
        return mock_repo_row, mock_telemetry, mock_comp_row

    def test_markdown_report_generated(self, tmp_path, monkeypatch):
        """generate_report_file should write a .md file and return (path, name, size)."""
        from services import report_service

        repo_row, telemetry, comp_row = self._mock_db_and_telemetry()

        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [repo_row, comp_row]
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        monkeypatch.setattr(report_service, "get_db", lambda: mock_conn)
        monkeypatch.setattr(report_service, "get_telemetry_metrics", lambda: telemetry)
        monkeypatch.chdir(tmp_path)

        local_path, file_name, file_size = report_service.generate_report_file(
            "repo-test", "markdown"
        )

        assert file_name.endswith(".md"), "Markdown report should have .md extension"
        assert os.path.exists(local_path), "Markdown file should be written to disk"
        assert file_size > 0, "Report file should have non-zero size"

        content = open(local_path, encoding="utf-8").read()
        assert "test-repo" in content
        assert "HIPAA" in content
        assert "SOX" in content

    def test_pdf_report_generated(self, tmp_path, monkeypatch):
        """generate_report_file should write a .pdf file for report_type='pdf'."""
        from services import report_service

        repo_row, telemetry, comp_row = self._mock_db_and_telemetry()

        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [repo_row, comp_row]
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        monkeypatch.setattr(report_service, "get_db", lambda: mock_conn)
        monkeypatch.setattr(report_service, "get_telemetry_metrics", lambda: telemetry)
        monkeypatch.chdir(tmp_path)

        local_path, file_name, file_size = report_service.generate_report_file(
            "repo-test", "pdf"
        )

        assert file_name.endswith(".pdf"), "PDF report should have .pdf extension"
        assert os.path.exists(local_path), "PDF file should be written to disk"
        assert file_size > 0, "PDF file should have non-zero size"
        # Verify it's a real PDF by checking the header magic bytes
        with open(local_path, "rb") as f:
            header = f.read(4)
        assert header == b"%PDF", "Output file should be a valid PDF (magic bytes %PDF)"

    def test_unsupported_format_raises(self, tmp_path, monkeypatch):
        """generate_report_file should raise ValueError for unsupported formats."""
        from services import report_service

        repo_row, telemetry, comp_row = self._mock_db_and_telemetry()

        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [repo_row, comp_row]
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        monkeypatch.setattr(report_service, "get_db", lambda: mock_conn)
        monkeypatch.setattr(report_service, "get_telemetry_metrics", lambda: telemetry)
        monkeypatch.chdir(tmp_path)

        with pytest.raises(ValueError, match="Unsupported report format"):
            report_service.generate_report_file("repo-test", "csv")

    def test_missing_repository_raises(self, tmp_path, monkeypatch):
        """generate_report_file should raise ValueError when repository is not found."""
        from services import report_service

        mock_cursor = MagicMock()
        mock_cursor.fetchone.return_value = None  # Repo not found
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        monkeypatch.setattr(report_service, "get_db", lambda: mock_conn)
        monkeypatch.chdir(tmp_path)

        with pytest.raises(ValueError, match="Repository not found"):
            report_service.generate_report_file("missing-repo-id", "pdf")


# ---------------------------------------------------------------------------
# Tests: POST /reports/generate
# ---------------------------------------------------------------------------


class TestGenerateEndpoint:
    """Tests for the /reports/generate HTTP endpoint."""

    def test_generate_pdf_success(self, client):
        """POST /reports/generate with valid PDF payload returns 200 with report metadata."""
        with (
            patch("api.reports.verify_repo_access") as mock_access,
            patch("api.reports.generate_report_file") as mock_gen,
            patch("api.reports.upload_file") as mock_upload,
            patch("api.reports.create_report"),
            patch("api.reports.log_audit_event"),
        ):
            mock_access.return_value = {"id": "repo-abc", "repository_name": "my-repo"}
            mock_gen.return_value = (
                "/tmp/audit_report_my-repo_123.pdf",
                "audit_report_my-repo_123.pdf",
                5000,
            )
            mock_upload.return_value = True

            with patch("os.path.exists", return_value=False):  # Suppress cleanup
                response = client.post(
                    "/reports/generate",
                    json={"repository_id": "repo-abc", "report_type": "pdf"},
                    headers={"Authorization": "Bearer mock-token"},
                )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "success"
        assert body["report"]["report_type"] == "pdf"
        assert body["report"]["repository_id"] == "repo-abc"
        assert body["report"]["file_size"] == 5000

    def test_generate_markdown_success(self, client):
        """POST /reports/generate with 'markdown' type succeeds."""
        with (
            patch("api.reports.verify_repo_access") as mock_access,
            patch("api.reports.generate_report_file") as mock_gen,
            patch("api.reports.upload_file") as mock_upload,
            patch("api.reports.create_report"),
            patch("api.reports.log_audit_event"),
        ):
            mock_access.return_value = {
                "id": "repo-xyz",
                "repository_name": "other-repo",
            }
            mock_gen.return_value = (
                "/tmp/audit_report_other-repo_999.md",
                "audit_report_other-repo_999.md",
                1200,
            )
            mock_upload.return_value = True

            with patch("os.path.exists", return_value=False):
                response = client.post(
                    "/reports/generate",
                    json={"repository_id": "repo-xyz", "report_type": "markdown"},
                    headers={"Authorization": "Bearer mock-token"},
                )

        assert response.status_code == 200
        assert response.json()["report"]["report_type"] == "markdown"

    def test_generate_invalid_type_returns_400(self, client):
        """POST /reports/generate with unsupported type should return 400."""
        with patch("api.reports.verify_repo_access") as mock_access:
            mock_access.return_value = {"id": "repo-abc", "repository_name": "my-repo"}
            response = client.post(
                "/reports/generate",
                json={"repository_id": "repo-abc", "report_type": "docx"},
                headers={"Authorization": "Bearer mock-token"},
            )

        assert response.status_code == 400
        assert "Unsupported report type" in response.json()["detail"]

    def test_generate_upload_failure_returns_500(self, client):
        """When S3 upload fails, the endpoint should return 500."""
        with (
            patch("api.reports.verify_repo_access") as mock_access,
            patch("api.reports.generate_report_file") as mock_gen,
            patch("api.reports.upload_file") as mock_upload,
        ):
            mock_access.return_value = {"id": "repo-abc", "repository_name": "my-repo"}
            mock_gen.return_value = (
                "/tmp/audit_report_my-repo_123.pdf",
                "audit_report_my-repo_123.pdf",
                5000,
            )
            mock_upload.return_value = False  # Simulate S3 failure

            with patch("os.path.exists", return_value=False):
                response = client.post(
                    "/reports/generate",
                    json={"repository_id": "repo-abc", "report_type": "pdf"},
                    headers={"Authorization": "Bearer mock-token"},
                )

        assert response.status_code == 500
        assert "Failed to upload" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Tests: GET /reports/history
# ---------------------------------------------------------------------------


class TestHistoryEndpoint:
    def test_history_returns_list(self, client):
        """GET /reports/history should return a list of historical reports."""
        import datetime

        mock_reports = [
            {
                "id": "r-001",
                "repository_id": "repo-abc",
                "name": "audit_report_my-repo_1.pdf",
                "report_type": "pdf",
                "s3_key": "reports/my-repo/audit_report_my-repo_1.pdf",
                "file_size": 5000,
                "created_at": datetime.datetime(2025, 6, 1, 12, 0, 0),
            }
        ]

        with (
            patch("api.reports.verify_repo_access") as mock_access,
            patch("api.reports.get_reports_by_repo") as mock_history,
        ):
            mock_access.return_value = {"id": "repo-abc", "repository_name": "my-repo"}
            mock_history.return_value = mock_reports

            response = client.get(
                "/reports/history",
                params={"repository_id": "repo-abc"},
                headers={"Authorization": "Bearer mock-token"},
            )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == "r-001"
        # created_at should be a string (ISO formatted)
        assert isinstance(data[0]["created_at"], str)

    def test_history_empty_list(self, client):
        """GET /reports/history returns an empty list when there are no reports."""
        with (
            patch("api.reports.verify_repo_access") as mock_access,
            patch("api.reports.get_reports_by_repo") as mock_history,
        ):
            mock_access.return_value = {"id": "repo-abc", "repository_name": "my-repo"}
            mock_history.return_value = []

            response = client.get(
                "/reports/history",
                params={"repository_id": "repo-abc"},
                headers={"Authorization": "Bearer mock-token"},
            )

        assert response.status_code == 200
        assert response.json() == []


# ---------------------------------------------------------------------------
# Tests: GET /reports/{report_id}/download
# ---------------------------------------------------------------------------


class TestDownloadEndpoint:
    def test_download_report_not_found_returns_404(self, client):
        """GET /reports/{id}/download for a missing report should return 404."""
        with patch("api.reports.get_report") as mock_get:
            mock_get.return_value = None

            response = client.get(
                "/reports/nonexistent-id/download",
                headers={"Authorization": "Bearer mock-token"},
            )

        assert response.status_code == 404
        assert "Report not found" in response.json()["detail"]

    def test_download_s3_failure_returns_500(self, client, tmp_path):
        """GET /reports/{id}/download returns 500 when S3 download fails."""
        mock_report = {
            "id": "r-001",
            "repository_id": "repo-abc",
            "name": "audit_report_my-repo_1.pdf",
            "report_type": "pdf",
            "s3_key": "reports/my-repo/audit_report_my-repo_1.pdf",
        }

        with (
            patch("api.reports.get_report") as mock_get,
            patch("api.reports.verify_repo_access"),
            patch("api.reports.download_file") as mock_dl,
            patch("os.makedirs"),
        ):
            mock_get.return_value = mock_report
            mock_dl.return_value = False  # Simulate S3 failure

            response = client.get(
                "/reports/r-001/download",
                headers={"Authorization": "Bearer mock-token"},
            )

        assert response.status_code == 500
        assert "Failed to retrieve" in response.json()["detail"]
