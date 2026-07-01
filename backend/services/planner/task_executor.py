import os
import json
from services.llm_service import generate_answer
from services.git_service import get_repo_obj # import validation helper

def execute_plan_step(repo_path: str, file_path: str, action: str, instruction: str) -> dict:
    """
    Executes a single step in the implementation plan:
    1. Generates patch/updates for the file.
    2. Generates test cases.
    3. Analyzes quality/risks.
    """
    # Safety checkout
    get_repo_obj(repo_path)
    
    # Read original file if modify action
    original_content = ""
    abs_file_path = os.path.join(repo_path, file_path)
    if action == "MODIFY" and os.path.exists(abs_file_path):
        try:
            with open(abs_file_path, "r", encoding="utf-8", errors="ignore") as f:
                original_content = f.read()
        except Exception:
            pass

    # 1. Generate updated code
    prompt_patch = f"""You are a professional software engineer.
Generate updated code for the file `{file_path}` based on this request.

Original File Content:
```
{original_content}
```

Coding Instruction:
"{instruction}"

Provide the complete updated code of the file. Do not include summary comments, no markdown fences, no explanation, only the source code.
"""
    updated_code = generate_answer(prompt_patch).strip()
    # Clean potential markdown fences
    if updated_code.startswith("```"):
        lines = updated_code.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        updated_code = "\n".join(lines).strip()

    # 2. Generate unit tests
    prompt_test = f"""You are a testing specialist.
Generate standard unit tests for the following code snippet from `{file_path}`.

Code:
```
{updated_code}
```

Format the test cases using a common test framework (like pytest or unittest).
Return ONLY the test source code with no explanation and no markdown backticks.
"""
    test_code = generate_answer(prompt_test).strip()
    if test_code.startswith("```"):
        lines = test_code.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        test_code = "\n".join(lines).strip()

    # 3. Code review audit
    prompt_audit = f"""You are a code reviewer.
Review the following changes for coding standards, security, performance, and formatting.

File: `{file_path}`
Code:
```
{updated_code}
```

Identify any potential bugs, bad practices, or security vulnerabilities in this code.
Provide your audit results in a concise bullet-point list.
"""
    audit_notes = generate_answer(prompt_audit).strip()

    return {
        "status": "success",
        "file": file_path,
        "action": action,
        "original": original_content,
        "updated": updated_code,
        "test_code": test_code,
        "audit": audit_notes
    }
