import pytest
from fastapi.testclient import TestClient
from main import app
from services.auth_service import encode_token
from services.knowledge_graph.graph_storage import insert_nodes, insert_edges

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_knowledge_data(shared_test_db):
    nodes = [
        {
            "id": "repo-auth-test::file1.py",
            "name": "file1.py",
            "type": "file",
            "path": "file1.py",
            "meta": {"size": 100},
        },
        {
            "id": "repo-auth-test::func1",
            "name": "func1",
            "type": "function",
            "path": "file1.py",
            "meta": {"line": 10},
        },
    ]
    edges = [
        {
            "id": "edge1",
            "source": "repo-auth-test::file1.py",
            "target": "repo-auth-test::func1",
            "relation_type": "contains",
        }
    ]
    insert_nodes("repo-auth-test", nodes)
    insert_edges("repo-auth-test", edges)


def test_get_react_flow_graph_success():
    token = encode_token("u-owner", "owner@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/knowledge/graph?repo_id=repo-auth-test", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) == 2
    assert len(data["edges"]) == 1

    node0 = data["nodes"][0]
    assert node0["id"] == "repo-auth-test::file1.py"
    assert node0["type"] == "default"
    assert node0["data"]["name"] == "file1.py"
    assert "position" in node0
    assert "style" in node0

    edge0 = data["edges"][0]
    assert edge0["id"] == "edge1"
    assert edge0["source"] == "repo-auth-test::file1.py"
    assert edge0["target"] == "repo-auth-test::func1"
    assert edge0["label"] == "contains"


def test_get_react_flow_graph_unauthorized():
    # u-stranger is not a member of proj-auth-test
    token = encode_token("u-stranger", "stranger@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/knowledge/graph?repo_id=repo-auth-test", headers=headers)
    assert response.status_code == 403
    assert "Access Denied" in response.json()["detail"]


def test_get_react_flow_graph_missing_params():
    token = encode_token("u-owner", "owner@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/knowledge/graph", headers=headers)
    assert response.status_code == 422
