import pytest
from settings import get_settings

# Force enforce_strict_auth to False globally for tests
settings = get_settings()
settings.enforce_strict_auth = False

from services.db_service import init_db, get_db, create_user, create_repository


@pytest.fixture(scope="session", autouse=True)
def init_test_db():
    settings.enforce_strict_auth = False
    init_db()


@pytest.fixture(scope="module")
def shared_test_db():
    """Clears standard database tables and seeds standard test data for RBAC and Admin tests."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Clear tables in dependency order
        cursor.execute("DELETE FROM project_members")
        cursor.execute("DELETE FROM comments")
        cursor.execute("DELETE FROM projects")
        cursor.execute("DELETE FROM repositories")
        cursor.execute("DELETE FROM organizations")
        cursor.execute("DELETE FROM audit_logs")
        cursor.execute("DELETE FROM users")
        conn.commit()

        # Seed standard users
        create_user("u-owner", "owner@test.com", "Project Owner", "")
        create_user("u-admin", "admin@test.com", "Project Admin", "")
        create_user("u-member", "member@test.com", "Project Member", "")
        create_user("u-viewer", "viewer@test.com", "Project Viewer", "")
        create_user("u-stranger", "stranger@test.com", "Stranger", "")

        # Seed organization
        cursor.execute(
            "INSERT INTO organizations (id, name) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            ("org-test", "Test Organization"),
        )

        # Seed repositories
        create_repository(
            repo_id="repo-auth-test",
            user_id="u-owner",
            name="auth-test-repo",
            path="repos/auth-test-repo",
            branch="main",
            status="active",
        )
        create_repository(
            repo_id="repo-admin-test",
            user_id="u-owner",
            name="admin-test-repo",
            path="repos/admin-test-repo",
            branch="main",
            status="active",
        )

        # Seed projects
        cursor.execute(
            "INSERT INTO projects (id, org_id, repository_id, name) VALUES (%s, %s, %s, %s)",
            ("proj-auth-test", "org-test", "repo-auth-test", "Auth Test Project"),
        )
        cursor.execute(
            "INSERT INTO projects (id, org_id, repository_id, name) VALUES (%s, %s, %s, %s)",
            ("proj-admin-test", "org-test", "repo-admin-test", "Admin Test Project"),
        )

        # Seed project memberships
        # RBAC project members
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            ("proj-auth-test", "u-owner", "owner"),
        )
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            ("proj-auth-test", "u-admin", "admin"),
        )
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            ("proj-auth-test", "u-member", "member"),
        )
        cursor.execute(
            "INSERT INTO project_members (project_id, user_id, role) VALUES (%s, %s, %s)",
            ("proj-auth-test", "u-viewer", "viewer"),
        )

        # Admin project members
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
    finally:
        conn.close()
