import pytest
from fastapi.testclient import TestClient
from main import app
from services.auth_service import encode_token
from services.db_service import get_db

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_org_tests(shared_test_db):
    pass


def test_create_and_list_organizations():
    token = encode_token("u-owner", "owner@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a new organization
    payload = {"name": "Integration Test Organization"}
    response = client.post(
        "/collaboration/organizations", json=payload, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["name"] == "Integration Test Organization"
    org_id = data["id"]
    assert org_id is not None

    # 2. Check that it exists in the database
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM organizations WHERE id = %s", (org_id,))
        row = cursor.fetchone()
        assert row is not None
        assert row["name"] == "Integration Test Organization"
    finally:
        conn.close()

    # 3. List organizations and check that it's included
    list_response = client.get("/collaboration/organizations", headers=headers)
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert len(list_data) >= 2  # org-test + the new one

    org_names = [org["name"] for org in list_data]
    assert "Integration Test Organization" in org_names
