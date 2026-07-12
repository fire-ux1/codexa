import pytest
from fastapi.testclient import TestClient
from main import app
from services.auth_service import encode_token
import api.devops

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_devops_tests(shared_test_db):
    pass


@pytest.fixture(autouse=True)
def mock_generators(monkeypatch):
    monkeypatch.setattr(
        api.devops,
        "generate_doc_asset",
        lambda repo, a_type: f"Mocked Doc Content for {a_type}",
    )
    monkeypatch.setattr(
        api.devops,
        "generate_devops_asset",
        lambda repo, a_type: f"Mocked DevOps Content for {a_type}",
    )


def test_generate_devops_or_doc_asset_success():
    token = encode_token("u-owner", "owner@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"repo_path": "repos/auth-test-repo", "asset_type": "readme"}
    response = client.post("/devops/generate", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["asset_type"] == "readme"
    assert "Mocked Doc Content" in data["content"]


def test_generate_devops_unsupported_asset_type():
    token = encode_token("u-owner", "owner@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "repo_path": "repos/auth-test-repo",
        "asset_type": "unsupported_type",
    }
    response = client.post("/devops/generate", json=payload, headers=headers)
    assert response.status_code == 400
    assert "Unsupported asset type" in response.json()["detail"]


def test_generate_devops_unauthorized():
    # u-viewer has viewer role (read-only)
    token = encode_token("u-viewer", "viewer@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"repo_path": "repos/auth-test-repo", "asset_type": "readme"}
    response = client.post("/devops/generate", json=payload, headers=headers)
    assert response.status_code == 403
    assert "Access Denied" in response.json()["detail"]


def test_generate_devops_service_failure(monkeypatch):
    def mock_fail(repo, a_type):
        raise RuntimeError("Service failure")

    monkeypatch.setattr(api.devops, "generate_doc_asset", mock_fail)

    token = encode_token("u-owner", "owner@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"repo_path": "repos/auth-test-repo", "asset_type": "readme"}
    response = client.post("/devops/generate", json=payload, headers=headers)
    assert response.status_code == 500
    assert "Service failure" in response.json()["detail"]
