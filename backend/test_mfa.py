import pytest
from fastapi.testclient import TestClient
from settings import get_settings

# Bypass strict Redis/DB startup checks for unit test execution
settings = get_settings()
settings.enforce_strict_auth = False

from main import app
from services.auth_service import encode_token
from services.db_service import init_db, get_db, create_user, get_user
import pyotp

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    settings.enforce_strict_auth = False
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Clear tables
        cursor.execute("DELETE FROM users")
        conn.commit()

        # Seed test user
        create_user("u-mfa-test", "mfa-test@codepilot.ai", "MFA User", "")
    finally:
        conn.close()


def test_mfa_setup_flow():
    """Verify setup endpoint returns secret key and QR SVG code."""
    token = encode_token("u-mfa-test", "mfa-test@codepilot.ai")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post("/auth/mfa/setup", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "mfa_secret" in data
    assert "qr_code_url" in data
    assert data["qr_code_url"].startswith("data:image/svg+xml;base64,")

    # Check secret was stored in DB but mfa_enabled is still False
    user = get_user("u-mfa-test")
    assert user["mfa_secret"] == data["mfa_secret"]
    assert bool(user["mfa_enabled"]) is False


def test_mfa_confirm_flow():
    """Verify confirming with correct TOTP code enables MFA."""
    token = encode_token("u-mfa-test", "mfa-test@codepilot.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch user to get secret key
    user = get_user("u-mfa-test")
    secret = user["mfa_secret"]
    assert secret is not None

    # Generate current TOTP code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    # Try invalid code first
    response = client.post(
        "/auth/mfa/confirm", json={"code": "000000"}, headers=headers
    )
    assert response.status_code == 400

    # Submit valid code
    response = client.post(
        "/auth/mfa/confirm", json={"code": valid_code}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Confirm MFA is enabled in DB
    user_updated = get_user("u-mfa-test")
    assert bool(user_updated["mfa_enabled"]) is True


def test_login_mfa_blocking():
    """Verify login endpoints block and require MFA if enabled."""
    # Try mock developer login for u-mfa-test
    # Note: developer_login uses 'mock-dev' user_id. We'll set MFA on mock-dev to test.
    conn = get_db()
    cursor = conn.cursor()
    try:
        secret = pyotp.random_base32()
        cursor.execute(
            """
            INSERT INTO users (id, email, name, mfa_secret, mfa_enabled)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                mfa_secret = EXCLUDED.mfa_secret,
                mfa_enabled = EXCLUDED.mfa_enabled
            """,
            ("mock-dev", "sandbox@codepilot.ai", "Sandbox Developer", secret, True),
        )
        conn.commit()
    finally:
        conn.close()

    # Request sandbox login
    payload = {"name": "Sandbox Developer", "email": "sandbox@codepilot.ai"}
    response = client.post("/auth/developer-login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["mfa_required"] is True
    assert "mfa_temp_token" in data

    # Verify temp token + code
    temp_token = data["mfa_temp_token"]
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    # Try incorrect code
    verify_payload = {"temp_token": temp_token, "code": "000000"}
    response = client.post("/auth/login/mfa-verify", json=verify_payload)
    assert response.status_code == 400

    # Submit correct code
    verify_payload["code"] = valid_code
    response = client.post("/auth/login/mfa-verify", json=verify_payload)
    assert response.status_code == 200
    login_data = response.json()
    assert "token" in login_data
    assert "refresh_token" in login_data
    assert login_data["user"]["id"] == "mock-dev"


def test_mfa_disable_flow():
    """Verify disabling MFA clears secret and enables status."""
    token = encode_token("mock-dev", "sandbox@codepilot.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch user to get secret
    user = get_user("mock-dev")
    secret = user["mfa_secret"]

    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    # Disable MFA
    response = client.post(
        "/auth/mfa/disable", json={"code": valid_code}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify columns are cleared in DB
    user_updated = get_user("mock-dev")
    assert user_updated["mfa_secret"] is None
    assert bool(user_updated["mfa_enabled"]) is False
