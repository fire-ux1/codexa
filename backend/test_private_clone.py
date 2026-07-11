"""
Unit tests for private repository cloning with access token injection.

Covers:
  - RepositoryCloneRequest schema: optional access_token field accepted
  - clone_repository() service: token correctly injected into HTTPS URL
  - clone_repository() service: non-HTTPS URLs are not mutated by the token
  - clone_repository() service: cloning proceeds without token (public repo)
  - POST /repository/clone endpoint: token forwarded correctly
  - POST /repository/clone endpoint: repo lock contention returns RuntimeError
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helper: lightweight app with just the repository router
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def client():
    from fastapi import FastAPI
    from api.repository import router as repo_router
    from api.repository import get_current_user_id

    app = FastAPI()
    app.include_router(repo_router, prefix="/repository")
    app.dependency_overrides[get_current_user_id] = lambda: "u-clone-user"
    return TestClient(app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Tests: RepositoryCloneRequest schema
# ---------------------------------------------------------------------------


class TestRepositoryCloneRequestSchema:
    def test_public_repo_schema_no_token(self):
        """access_token is optional — schema should accept a payload without it."""
        from api.schemas import RepositoryCloneRequest

        req = RepositoryCloneRequest(repo_url="https://github.com/org/public-repo.git")
        assert req.access_token is None

    def test_private_repo_schema_with_token(self):
        """Schema accepts access_token for private repository URLs."""
        from api.schemas import RepositoryCloneRequest

        req = RepositoryCloneRequest(
            repo_url="https://github.com/org/private-repo.git",
            access_token="ghp_testTokenABC123",
        )
        assert req.access_token == "ghp_testTokenABC123"

    def test_invalid_url_raises_validation_error(self):
        """Non-URL values for repo_url should raise a validation error."""
        from pydantic import ValidationError
        from api.schemas import RepositoryCloneRequest

        with pytest.raises(ValidationError):
            RepositoryCloneRequest(repo_url="not-a-url", access_token=None)


# ---------------------------------------------------------------------------
# Tests: clone_repository() service — token URL injection
# ---------------------------------------------------------------------------


class TestCloneRepositoryTokenInjection:
    """Tests focused on the access_token URL rewriting logic in repo_service."""

    def _build_mocks(self):
        """Returns a dict of common mock patchers for clone_repository."""
        return {
            "acquire_lock": patch(
                "services.repo_service.acquire_repo_lock", return_value=True
            ),
            "release_lock": patch("services.repo_service.release_repo_lock"),
            "get_repos": patch(
                "services.repo_service.get_repositories_for_user", return_value=[]
            ),
            "create_repo": patch("services.repo_service.create_repository"),
            "update_status": patch("services.repo_service.update_repository_status"),
            "restore_s3": patch(
                "services.repo_service.restore_repo_from_s3", return_value=False
            ),
            "path_exists": patch("os.path.exists", return_value=False),
            "makedirs": patch("os.makedirs"),
        }

    def test_token_injected_into_https_clone_url(self):
        """When an access_token is provided, it must be embedded in the HTTPS clone URL."""
        mocks = self._build_mocks()
        token = "ghp_myPrivateAccessToken"
        repo_url = "https://github.com/org/private-repo.git"
        expected_clone_url = f"https://{token}@github.com/org/private-repo.git"

        with (
            mocks["acquire_lock"],
            mocks["release_lock"],
            mocks["get_repos"],
            mocks["create_repo"],
            mocks["update_status"],
            mocks["restore_s3"],
            mocks["path_exists"],
            mocks["makedirs"],
            patch("services.repo_service.Repo") as mock_git,
        ):
            from services.repo_service import clone_repository

            clone_repository(repo_url, user_id="u-clone-user", access_token=token)

            mock_git.clone_from.assert_called_once()
            actual_url = mock_git.clone_from.call_args[0][0]
            assert actual_url == expected_clone_url, (
                f"Token should be embedded in HTTPS URL. Got: {actual_url}"
            )

    def test_no_token_uses_original_url(self):
        """Without an access_token, the original URL must be passed to git.clone_from."""
        mocks = self._build_mocks()
        repo_url = "https://github.com/org/public-repo.git"

        with (
            mocks["acquire_lock"],
            mocks["release_lock"],
            mocks["get_repos"],
            mocks["create_repo"],
            mocks["update_status"],
            mocks["restore_s3"],
            mocks["path_exists"],
            mocks["makedirs"],
            patch("services.repo_service.Repo") as mock_git,
        ):
            from services.repo_service import clone_repository

            clone_repository(repo_url, user_id="u-clone-user", access_token=None)

            mock_git.clone_from.assert_called_once()
            actual_url = mock_git.clone_from.call_args[0][0]
            assert actual_url == repo_url, (
                "Public URL must not be modified when no token is provided"
            )

    def test_ssh_url_not_mutated_even_with_token(self):
        """SSH URLs (git@…) should NOT be modified even if an access_token is supplied."""
        mocks = self._build_mocks()
        repo_url = "git@github.com:org/private-repo.git"
        token = "ghp_shouldNotBeInserted"

        with (
            mocks["acquire_lock"],
            mocks["release_lock"],
            mocks["get_repos"],
            mocks["create_repo"],
            mocks["update_status"],
            mocks["restore_s3"],
            mocks["path_exists"],
            mocks["makedirs"],
            patch("services.repo_service.Repo") as mock_git,
        ):
            from services.repo_service import clone_repository

            clone_repository(repo_url, user_id="u-clone-user", access_token=token)

            actual_url = mock_git.clone_from.call_args[0][0]
            assert token not in actual_url, (
                "Access token must NOT be injected into non-HTTPS (SSH) URLs"
            )
            assert actual_url == repo_url

    def test_s3_restore_skips_git_clone(self):
        """If S3 cache restore succeeds, git.clone_from should NOT be called."""
        mocks = self._build_mocks()
        # Override restore_s3 to succeed
        mocks["restore_s3"] = patch(
            "services.repo_service.restore_repo_from_s3", return_value=True
        )

        with (
            mocks["acquire_lock"],
            mocks["release_lock"],
            mocks["get_repos"],
            mocks["create_repo"],
            mocks["update_status"],
            mocks["restore_s3"],
            mocks["path_exists"],
            mocks["makedirs"],
            patch("services.repo_service.Repo") as mock_git,
        ):
            from services.repo_service import clone_repository

            clone_repository(
                "https://github.com/org/repo.git",
                user_id="u-clone-user",
                access_token="ghp_sometoken",
            )

            mock_git.clone_from.assert_not_called()

    def test_lock_busy_raises_runtime_error(self):
        """If the repository lock cannot be acquired, RuntimeError must be raised."""
        with (
            patch("services.repo_service.acquire_repo_lock", return_value=False),
            patch("services.repo_service.get_repositories_for_user", return_value=[]),
            patch("os.makedirs"),
        ):
            from services.repo_service import clone_repository

            with pytest.raises(RuntimeError, match="currently busy"):
                clone_repository(
                    "https://github.com/org/locked-repo.git",
                    user_id="u-clone-user",
                    access_token=None,
                )

    def test_clone_error_releases_lock(self):
        """If git.clone_from raises, the repo lock must still be released."""
        with (
            patch("services.repo_service.acquire_repo_lock", return_value=True) as _acq,
            patch("services.repo_service.release_repo_lock") as mock_release,
            patch("services.repo_service.get_repositories_for_user", return_value=[]),
            patch("services.repo_service.create_repository"),
            patch("services.repo_service.update_repository_status"),
            patch("services.repo_service.restore_repo_from_s3", return_value=False),
            patch("os.path.exists", return_value=False),
            patch("os.makedirs"),
            patch("services.repo_service.Repo") as mock_git,
        ):
            mock_git.clone_from.side_effect = Exception(
                "git clone failed: Authentication required"
            )

            from services.repo_service import clone_repository

            with pytest.raises(Exception, match="Authentication required"):
                clone_repository(
                    "https://github.com/org/private-repo.git",
                    user_id="u-clone-user",
                    access_token="bad_token",
                )

            mock_release.assert_called_once()


# ---------------------------------------------------------------------------
# Tests: POST /repository/clone endpoint
# ---------------------------------------------------------------------------


class TestCloneEndpoint:
    """Integration-style tests for the /repository/clone HTTP endpoint."""

    def test_clone_public_repo_success(self, client):
        """POST /repository/clone without access_token succeeds for a public repo."""
        with (
            patch("api.repository.clone_repository") as mock_clone,
            patch("api.repository.enqueue_background_job"),
            patch("api.repository.log_audit_event"),
        ):
            mock_clone.return_value = (
                "repos/public-repo",
                "public-repo",
                "repo-id-111",
                True,
            )

            response = client.post(
                "/repository/clone",
                json={"repo_url": "https://github.com/org/public-repo.git"},
                headers={"Authorization": "Bearer mock-token"},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "success"
        assert "repos/public-repo" in body["path"]

    def test_clone_private_repo_with_token(self, client):
        """POST /repository/clone with access_token correctly passes it to the service."""
        token = "ghp_validPersonalAccessToken"

        with (
            patch("api.repository.clone_repository") as mock_clone,
            patch("api.repository.enqueue_background_job"),
            patch("api.repository.log_audit_event"),
        ):
            mock_clone.return_value = (
                "repos/private-repo",
                "private-repo",
                "repo-id-222",
                True,
            )

            response = client.post(
                "/repository/clone",
                json={
                    "repo_url": "https://github.com/org/private-repo.git",
                    "access_token": token,
                },
                headers={"Authorization": "Bearer mock-token"},
            )

        assert response.status_code == 200
        # Verify access_token was forwarded to the service
        call_kwargs = mock_clone.call_args
        assert call_kwargs.kwargs.get("access_token") == token or (
            len(call_kwargs.args) > 3 and call_kwargs.args[3] == token
        ), "access_token must be forwarded from endpoint to clone_repository()"

    def test_clone_lock_busy_returns_error(self, client):
        """When the repo is locked, the endpoint should return a 5xx error."""
        with patch("api.repository.clone_repository") as mock_clone:
            mock_clone.side_effect = RuntimeError(
                "Repository is currently busy with another operation."
            )

            response = client.post(
                "/repository/clone",
                json={"repo_url": "https://github.com/org/busy-repo.git"},
                headers={"Authorization": "Bearer mock-token"},
            )

        # FastAPI will surface an unhandled RuntimeError as 500
        assert response.status_code == 500

    def test_clone_invalid_url_returns_422(self, client):
        """POST /repository/clone with a non-URL string should fail schema validation (422)."""
        response = client.post(
            "/repository/clone",
            json={"repo_url": "not-a-url"},
            headers={"Authorization": "Bearer mock-token"},
        )

        assert response.status_code == 422, (
            "Pydantic HttpUrl validation should reject plain strings"
        )
