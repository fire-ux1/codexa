import pytest
from fastapi.testclient import TestClient
from settings import get_settings

# Bypass strict Redis/DB startup checks for unit test execution
settings = get_settings()
settings.enforce_strict_auth = False

from main import app
from services.auth_service import encode_token
from services.db_service import init_db, get_db, create_user

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
        cursor.execute("DELETE FROM notifications")
        cursor.execute("DELETE FROM compliance_settings")
        conn.commit()

        # Seed test user
        create_user("u-nc-test", "nc-test@codepilot.ai", "Compliance Tester", "")
    finally:
        conn.close()


def test_notifications_lifecycle():
    token = encode_token("u-nc-test", "nc-test@codepilot.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch notifications. Since database is empty, it should auto-seed default alerts.
    response = client.get("/notifications", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2

    # Check alert parameters
    notif1 = data[0]
    assert "title" in notif1
    assert "message" in notif1
    assert notif1["read"] is False

    # 2. Mark one notification as read
    notif_id = notif1["id"]
    response = client.put(f"/notifications/{notif_id}/read", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify state updated in list
    response = client.get("/notifications", headers=headers)
    assert response.status_code == 200
    updated_data = response.json()
    matched_notif = next(x for x in updated_data if x["id"] == notif_id)
    assert matched_notif["read"] is True

    # 3. Mark all as read
    response = client.post("/notifications/read-all", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify all are read now
    response = client.get("/notifications", headers=headers)
    assert response.status_code == 200
    final_data = response.json()
    assert all(x["read"] is True for x in final_data)


def test_compliance_settings():
    token = encode_token("u-nc-test", "nc-test@codepilot.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get default settings
    response = client.get("/compliance/settings", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "hipaa_mode" in data
    assert "sox_mode" in data
    assert "retention_days" in data

    # 2. Update settings
    payload = {
        "hipaa_mode": True,
        "sox_mode": True,
        "retention_days": 180,
        "session_timeout": False,
        "slack_enabled": True,
        "jira_enabled": False,
        "github_ent_enabled": True,
    }
    response = client.put("/compliance/settings", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # 3. Fetch again and verify saved parameters
    response = client.get("/compliance/settings", headers=headers)
    assert response.status_code == 200
    updated = response.json()
    assert bool(updated["hipaa_mode"]) is True
    assert bool(updated["sox_mode"]) is True
    assert updated["retention_days"] == 180
    assert bool(updated["session_timeout"]) is False
    assert bool(updated["slack_enabled"]) is True
    assert bool(updated["jira_enabled"]) is False
    assert bool(updated["github_ent_enabled"]) is True
