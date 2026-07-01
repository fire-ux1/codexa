import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from services.git_service import get_repo_status
from services.agents.coordinator import AGENT_PROMPTS

def test_git_service_constraints():
    print("Testing Git service path constraint...")
    
    # Test permission check outside repos (get_repo_status catches the error and returns a dict)
    res = get_repo_status("/tmp/nonexistent")
    assert res.get("status") == "error", "Expected status 'error'"
    assert "Access denied" in res.get("message"), f"Expected access denied error message, got: {res.get('message')}"
    print("SUCCESS: Outside repos check works")

def test_agent_coordinator_prompts():
    print("Testing Agent Coordinator Prompts mapping...")
    
    # Assert prompts exist for each category
    assert len(AGENT_PROMPTS) == 7
    print(f"SUCCESS: Mapped {len(AGENT_PROMPTS)} specialist agent prompts")

def run_all_tests():
    try:
        test_git_service_constraints()
        test_agent_coordinator_prompts()
        print("\nAll Git & Agents unit tests passed successfully!")
    except AssertionError as e:
        print(f"Assertion failed: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()
