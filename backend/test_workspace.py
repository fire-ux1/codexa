from services.conversation_memory import memory_manager
from services.context_builder import parse_slash_command, build_context_prompt
from services.workspace_service import handle_workspace_chat_stream

def test_conversation_memory():
    print("Testing Conversation Memory...")
    # Get or create session
    session = memory_manager.get_or_create("test-session-123")
    assert session.conversation_id == "test-session-123"
    
    # Verify defaults
    assert session.repo == ""
    assert session.messages == []
    
    # Modify session
    session.repo = "repos/test-repo"
    session.messages.append({"role": "user", "content": "hello"})
    
    # Retrieve and verify
    retrieved = memory_manager.get("test-session-123")
    assert retrieved.repo == "repos/test-repo"
    assert len(retrieved.messages) == 1
    
    # List sessions
    sessions = memory_manager.list_sessions()
    assert len(sessions) == 1
    assert sessions[0]["conversation_id"] == "test-session-123"
    print("Conversation Memory: SUCCESS")

def test_context_builder():
    print("Testing Context Builder...")
    # Test slash command parsing
    cmd_explain = parse_slash_command("/explain some code")
    assert "Explain the following code segment or focus area in detail:" in cmd_explain
    assert "some code" in cmd_explain
    
    cmd_unknown = parse_slash_command("plain user query")
    assert cmd_unknown == "plain user query"
    
    # Test prompt building
    prompt = build_context_prompt(
        repo_path="repos/my-repo",
        file_path="main.py",
        symbol_name="my_func",
        selection="def my_func():\n    pass",
        messages=[{"role": "user", "content": "hi"}],
        user_query="/explain"
    )
    
    assert "Current Repository: my-repo" in prompt
    assert "Active File: main.py" in prompt
    assert "Active Symbol Focus: my_func" in prompt
    assert "Current Selected Code:" in prompt
    assert "Developer: hi" in prompt
    assert "Explain the following code segment or focus area in detail:\nthe active code block/context" in prompt
    print("Context Builder: SUCCESS")

if __name__ == "__main__":
    test_conversation_memory()
    test_context_builder()
    print("All workspace unit tests passed successfully!")
