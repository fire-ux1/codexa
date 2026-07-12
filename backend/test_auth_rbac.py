import pytest
import jwt
import datetime
from fastapi import HTTPException
from settings import get_settings
from services.auth_service import (
    encode_token,
    encode_refresh_token,
    decode_token,
    get_user_id_from_token,
)
from api.auth import get_current_user_id
from services.db_service import init_db, get_db, create_user, create_repository
from services.auth_validation import (
    verify_repo_access,
    verify_repo_write_access,
    get_repo_for_file_path,
    verify_file_access,
)
from services.websocket_auth import verify_project_role, verify_project_membership

settings = get_settings()
settings.enforce_strict_auth = True


@pytest.fixture(scope="module", autouse=True)
def setup_test_db(shared_test_db):
    settings.enforce_strict_auth = True


def test_token_encode_decode():
    """Verify that JWT encode and decode work correctly and validate exp claims."""
    token = encode_token("test-user", "test@user.com")
    payload = decode_token(token)
    assert payload["user_id"] == "test-user"
    assert payload["email"] == "test@user.com"


def test_token_expiry():
    """Verify that expired tokens raise jwt.ExpiredSignatureError."""
    # Generate token with negative expiry
    payload = {
        "exp": datetime.datetime.utcnow() - datetime.timedelta(seconds=10),
        "iat": datetime.datetime.utcnow() - datetime.timedelta(seconds=20),
        "user_id": "expired-user",
        "email": "expired@user.com",
    }
    expired_token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(expired_token)

    assert get_user_id_from_token(expired_token) is None


def test_sandbox_login_toggle():
    """Verify settings.allow_sandbox_login toggling logic (can check manually or simulated)."""
    orig_allow = settings.allow_sandbox_login
    try:
        # Simulate allow sandbox
        settings.allow_sandbox_login = True
        from services.websocket_auth import authenticate_ws_user

        assert authenticate_ws_user(None) == "mock-dev"

        # Simulate disable sandbox
        settings.allow_sandbox_login = False
        assert authenticate_ws_user(None) is None
    finally:
        settings.allow_sandbox_login = orig_allow


def test_repo_read_permissions():
    """Verify that verify_repo_access correctly allows owners and project members, and rejects strangers."""
    # 1. Owner has access
    repo = verify_repo_access("repo-auth-test", "u-owner")
    assert repo["id"] == "repo-auth-test"

    # 2. Project admin/member/viewer has access
    assert verify_repo_access("repo-auth-test", "u-admin")["id"] == "repo-auth-test"
    assert verify_repo_access("repo-auth-test", "u-member")["id"] == "repo-auth-test"
    assert verify_repo_access("repo-auth-test", "u-viewer")["id"] == "repo-auth-test"

    # 3. Stranger is rejected with 403
    with pytest.raises(HTTPException) as exc:
        verify_repo_access("repo-auth-test", "u-stranger")
    assert exc.value.status_code == 403


def test_repo_write_permissions():
    """Verify that verify_repo_write_access correctly rejects viewers and strangers, while allowing owner/members."""
    # 1. Owner and admin/member have write access
    assert (
        verify_repo_write_access("repo-auth-test", "u-owner")["id"] == "repo-auth-test"
    )
    assert (
        verify_repo_write_access("repo-auth-test", "u-admin")["id"] == "repo-auth-test"
    )
    assert (
        verify_repo_write_access("repo-auth-test", "u-member")["id"] == "repo-auth-test"
    )

    # 2. Viewer (read-only) is rejected with 403
    with pytest.raises(HTTPException) as exc:
        verify_repo_write_access("repo-auth-test", "u-viewer")
    assert exc.value.status_code == 403
    assert "read-only" in exc.value.detail

    # 3. Stranger is rejected with 403
    with pytest.raises(HTTPException) as exc:
        verify_repo_write_access("repo-auth-test", "u-stranger")
    assert exc.value.status_code == 403


def test_project_membership_and_role_checks():
    """Verify verify_project_membership and verify_project_role helpers."""
    assert verify_project_membership("u-member", "proj-auth-test") is True
    assert verify_project_membership("u-stranger", "proj-auth-test") is False

    assert verify_project_role("u-owner", "proj-auth-test", ["owner"]) is True
    assert verify_project_role("u-admin", "proj-auth-test", ["owner"]) is False
    assert verify_project_role("u-admin", "proj-auth-test", ["owner", "admin"]) is True
    assert verify_project_role("u-viewer", "proj-auth-test", ["viewer"]) is True


def test_file_access_permissions():
    """Verify verify_file_access matches repo boundaries."""
    # The seeded repository path is repos/auth-test-repo
    # Check that a file inside is correctly matched to repo-auth-test
    repo_id = get_repo_for_file_path("repos/auth-test-repo/src/main.py")
    assert repo_id == "repo-auth-test"

    # Verify u-member can read the file
    verify_file_access("repos/auth-test-repo/src/main.py", "u-member", write=False)

    # Verify u-viewer can read but NOT write
    verify_file_access("repos/auth-test-repo/src/main.py", "u-viewer", write=False)
    with pytest.raises(HTTPException) as exc:
        verify_file_access("repos/auth-test-repo/src/main.py", "u-viewer", write=True)
    assert exc.value.status_code == 403


def test_token_refresh_and_revocation():
    """Verify refresh token flow and token revocation on global logout."""
    # 1. Generate access and refresh tokens
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT token_version FROM users WHERE id = %s", ("u-member",))
    row = cursor.fetchone()
    token_version = row["token_version"] if row else 1
    conn.close()

    access_tok = encode_token("u-member", "member@test.com", token_version)
    refresh_tok = encode_refresh_token("u-member", "member@test.com", token_version)

    # Decode check
    decoded_access = decode_token(access_tok)
    assert decoded_access["type"] == "access"
    assert decoded_access["token_version"] == token_version

    decoded_refresh = decode_token(refresh_tok)
    assert decoded_refresh["type"] == "refresh"
    assert decoded_refresh["token_version"] == token_version

    # Validate active token version
    user_id = get_current_user_id(f"Bearer {access_tok}")
    assert user_id == "u-member"

    # 2. Simulate global logout (revoke all tokens)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET token_version = token_version + 1 WHERE id = %s",
        ("u-member",),
    )
    conn.commit()
    conn.close()

    # Old token decoding should fail inside get_current_user_id
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(f"Bearer {access_tok}")
    assert exc.value.status_code == 401
    assert "revoked" in exc.value.detail or "Invalid" in exc.value.detail


def test_audit_logging():
    """Verify that audit logs are correctly written to the database."""
    from services.audit_service import log_audit_event

    success = log_audit_event(
        user_id="u-owner",
        action="test_audit_event",
        project_id="proj-auth-test",
        details={"test_key": "test_val"},
    )
    assert success is True

    # Query DB and verify
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE action = 'test_audit_event'")
    row = cursor.fetchone()
    conn.close()

    assert row is not None
    assert row["user_id"] == "u-owner"
    assert row["project_id"] == "proj-auth-test"
    assert "test_key" in row["details"]


def test_api_key_lifecycle():
    """Verify personal API key lifecycle: creation, auth verification, listing, and revocation."""
    import secrets
    import hashlib
    import uuid

    # 1. Create API key
    raw_key = "sk_live_" + secrets.token_hex(24)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_id = str(uuid.uuid4())
    prefix = raw_key[:12]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO api_keys (id, user_id, name, key_hash, prefix) VALUES (%s, %s, %s, %s, %s)",
        (key_id, "u-member", "Test API Key", key_hash, prefix),
    )
    conn.commit()
    conn.close()

    # 2. Authenticate using API Key
    user_id = get_current_user_id(f"Bearer {raw_key}")
    assert user_id == "u-member"

    # 3. Check listing keys
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM api_keys WHERE user_id = %s", ("u-member",))
    rows = cursor.fetchall()
    conn.close()
    assert len(rows) > 0
    assert rows[0]["name"] == "Test API Key"

    # 4. Revoke key
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM api_keys WHERE id = %s", (key_id,))
    conn.commit()
    conn.close()

    # Authenticating should fail
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(f"Bearer {raw_key}")
    assert exc.value.status_code == 401


class MockRequest:
    def __init__(self, query_params=None, path_params=None, body_data=None):
        self.query_params = query_params or {}
        self.path_params = path_params or {}
        self.body_data = body_data or {}

        # Simple mock URL
        class MockURL:
            path = "/test/path"

        self.url = MockURL()

    async def json(self):
        if not self.body_data:
            raise Exception("No body")
        return self.body_data


@pytest.mark.asyncio
async def test_permission_dependencies():
    """Verify require_repo_read and require_repo_write resolve and validate permissions."""
    from services.auth_validation import require_repo_read, require_repo_write

    # 1. Resolve via query params
    req_query = MockRequest(query_params={"repo_id": "repo-auth-test"})
    repo = await require_repo_read(req_query, user_id="u-member")
    assert repo["id"] == "repo-auth-test"

    # 2. Resolve via JSON body
    req_body = MockRequest(body_data={"repo_path": "repos/auth-test-repo"})
    repo = await require_repo_read(req_body, user_id="u-member")
    assert repo["id"] == "repo-auth-test"

    # 3. Resolve write permission (viewer is rejected)
    req_query_write = MockRequest(query_params={"repo_id": "repo-auth-test"})
    with pytest.raises(HTTPException) as exc:
        await require_repo_write(req_query_write, user_id="u-viewer")
    assert exc.value.status_code == 403
