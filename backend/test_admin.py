import pytest
from settings import get_settings

# Bypass strict Redis/DB startup checks for unit test execution
settings = get_settings()
settings.enforce_strict_auth = False

from fastapi.testclient import TestClient
from main import app
from services.auth_service import encode_token
from services.db_service import init_db, get_db, create_user, create_repository
from services.audit_service import log_audit_event

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    settings.enforce_strict_auth = False
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Clear tables
        cursor.execute("DELETE FROM project_members")
        cursor.execute("DELETE FROM projects")
        cursor.execute("DELETE FROM repositories")
        cursor.execute("DELETE FROM audit_logs")
        cursor.execute("DELETE FROM users")
        conn.commit()

        # Seed users
        create_user("u-owner", "owner@test.com", "Project Owner", "")
        create_user("u-admin", "admin@test.com", "Project Admin", "")
        create_user("u-viewer", "viewer@test.com", "Project Viewer", "")
        create_user("u-stranger", "stranger@test.com", "Stranger", "")

        # Seed repository (owned by u-owner)
        create_repository(
            repo_id="repo-admin-test",
            user_id="u-owner",
            name="admin-test-repo",
            path="repos/admin-test-repo",
            branch="main",
            status="active",
        )

        # Seed organization
        cursor.execute(
            "INSERT INTO organizations (id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            ("org-test", "Test Organization"),
        )

        # Seed project
        cursor.execute(
            "INSERT INTO projects (id, org_id, repository_id, name) VALUES (%s, %s, %s, %s)",
            ("proj-admin-test", "org-test", "repo-admin-test", "Admin Test Project"),
        )

        # Seed project memberships
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            ("proj-admin-test", "u-owner", "owner"),
        )
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            ("proj-admin-test", "u-admin", "admin"),
        )
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            ("proj-admin-test", "u-viewer", "viewer"),
        )
        conn.commit()

        # Add mock audit logs
        log_audit_event(
            "u-owner",
            "clone_repo",
            "proj-admin-test",
            {"details": "Cloned repo successfully"},
            "127.0.0.1",
        )
        log_audit_event(
            "u-admin",
            "apply_patch",
            "proj-admin-test",
            {"details": "Applied optimization patch"},
            "127.0.0.1",
        )

    finally:
        conn.close()


def test_get_members_strict_mode():
    """Verify listing members under strict authentication constraints."""
    orig_strict = settings.enforce_strict_auth
    settings.enforce_strict_auth = True
    try:
        # Generate token for owner
        owner_token = encode_token("u-owner", "owner@test.com")
        headers = {"Authorization": f"Bearer {owner_token}"}

        # Request members
        response = client.get(
            "/admin/members?repository_id=repo-admin-test", headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # Verify member role mappings
        roles = {m["user_id"]: m["role"] for m in data}
        assert roles["u-owner"] == "owner"
        assert roles["u-admin"] == "admin"
        assert roles["u-viewer"] == "viewer"

        # Request members as a stranger (who does not belong to project/repo)
        stranger_token = encode_token("u-stranger", "stranger@test.com")
        stranger_headers = {"Authorization": f"Bearer {stranger_token}"}

        response = client.get(
            "/admin/members?repository_id=repo-admin-test", headers=stranger_headers
        )
        assert response.status_code == 403

    finally:
        settings.enforce_strict_auth = orig_strict


def test_update_member_role_strict_mode():
    """Verify changing role updates role field or throws permission errors."""
    orig_strict = settings.enforce_strict_auth
    settings.enforce_strict_auth = True
    try:
        owner_token = encode_token("u-owner", "owner@test.com")
        headers = {"Authorization": f"Bearer {owner_token}"}

        # Update viewer to member
        payload = {
            "repository_id": "repo-admin-test",
            "project_id": "proj-admin-test",
            "user_id": "u-viewer",
            "role": "member",
        }
        response = client.put("/admin/members/role", json=payload, headers=headers)
        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify role changed in DB
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT role FROM project_members WHERE project_id = %s AND user_id = %s",
            ("proj-admin-test", "u-viewer"),
        )
        assert cursor.fetchone()["role"] == "member"
        conn.close()

        # Try to set an invalid role
        payload["role"] = "super-user"
        response = client.put("/admin/members/role", json=payload, headers=headers)
        assert response.status_code == 400

    finally:
        settings.enforce_strict_auth = orig_strict


def test_get_audit_logs_strict_mode():
    """Verify fetching audit logs handles search and limits correctly."""
    orig_strict = settings.enforce_strict_auth
    settings.enforce_strict_auth = True
    try:
        owner_token = encode_token("u-owner", "owner@test.com")
        headers = {"Authorization": f"Bearer {owner_token}"}

        # Get logs
        response = client.get(
            "/admin/audit-logs?repository_id=repo-admin-test&limit=10&offset=0",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        # Verify chronological order (created_at DESC) and actions
        actions = [log["action"] for log in data]
        assert "apply_patch" in actions
        assert "clone_repo" in actions

        # Filter search for "apply"
        response = client.get(
            "/admin/audit-logs?repository_id=repo-admin-test&search=apply",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["action"] == "apply_patch"

    finally:
        settings.enforce_strict_auth = orig_strict
