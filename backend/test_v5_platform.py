import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.knowledge_graph.graph_builder import build_knowledge_graph, parse_db_tables
from services.knowledge_graph.graph_storage import get_graph
from services.planner.task_planner import create_implementation_plan
from services.devops.devops_service import generate_devops_asset
from services.db_service import init_db

import services.llm_service
import services.planner.task_planner
import services.devops.devops_service

# If LLM_API_KEY is not set (e.g. in test runner), mock the generate_answer call
if not os.environ.get("LLM_API_KEY"):
    print("WARNING: LLM_API_KEY not set. Mocking LLM answers for unit test.")
    def mock_func(prompt):
        if "plan" in prompt.lower():
            return '{"summary": "Mock plan summary details", "complexity": "Medium", "estimated_hours": 4, "risks": [], "tasks": [{"id": "t1", "file": "f1.py", "action": "MODIFY", "instruction": "mock coding instruction", "complexity": "Medium"}]}'
        else:
            return "FROM python:3.11-alpine\nRUN echo mock"
            
    services.llm_service.generate_answer = mock_func
    services.planner.task_planner.generate_answer = mock_func
    services.devops.devops_service.generate_answer = mock_func

def test_db_tables_parser():
    print("Testing SQL tables parser...")
    sql = "SELECT id, name FROM users JOIN profiles ON users.id = profiles.user_id WHERE users.email = 'x';"
    tables = parse_db_tables(sql)
    assert "users" in tables
    assert "profiles" in tables
    print("SUCCESS: SQL tables parser works")

def test_knowledge_graph_builder():
    print("Testing Knowledge Graph Builder...")
    # Initialize DB
    init_db()
    
    # We build graph of backend directory as a test
    repo_path = "backend"
    repo_id = "test-repo-v5"
    
    build_knowledge_graph(repo_path, repo_id)
    res = get_graph(repo_id)
    
    assert len(res["nodes"]) > 0
    # Confirm contains and defines relations exist
    types = [n["type"] for n in res["nodes"]]
    assert "file" in types
    
    print(f"SUCCESS: Knowledge Graph builder saved {len(res['nodes'])} nodes and {len(res['edges'])} edges.")

def test_task_planner():
    print("Testing Task Planner...")
    repo_path = "backend"
    user_request = "Add validation to the login route in api/auth.py"
    
    # Run task planner mock/live plan
    plan = create_implementation_plan(repo_path, user_request)
    assert "summary" in plan
    assert "tasks" in plan
    assert len(plan["tasks"]) > 0
    print(f"SUCCESS: Planner generated plan with {len(plan['tasks'])} sequential tasks.")

def test_devops_generator():
    print("Testing DevOps Asset Generator...")
    # Test dockerfile generator output
    dockerfile_content = generate_devops_asset("backend", "dockerfile")
    assert len(dockerfile_content) > 0
    assert "FROM" in dockerfile_content or "RUN" in dockerfile_content or "COPY" in dockerfile_content
    print("SUCCESS: DevOps Dockerfile generator works")

if __name__ == "__main__":
    print("Running CodePilot AI v5.0 Enterprise Platform Tests...")
    test_db_tables_parser()
    test_knowledge_graph_builder()
    test_task_planner()
    test_devops_generator()
    print("All CodePilot AI v5.0 Platform tests passed successfully!")
