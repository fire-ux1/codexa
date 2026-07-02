import os
from fastapi import HTTPException

def validate_safe_path(path: str) -> str:
    """
    Validates that a file path is safe and stays within permitted directories:
    - The absolute repos/ directory (where git clones repositories)
    - The absolute project workspace root directory.
    Prevents path traversal attacks (e.g. using '..' sequences).
    """
    if not path:
        raise HTTPException(status_code=400, detail="Invalid path parameter")

    # Resolve absolute paths
    abs_path = os.path.abspath(path)
    abs_repos = os.path.abspath("repos")
    abs_workspace = os.path.abspath(".")

    # Ensure trailing separators are present to verify subdirectory relationship accurately
    repos_prefix = abs_repos + os.sep
    workspace_prefix = abs_workspace + os.sep

    in_repos = abs_path.startswith(repos_prefix) or abs_path == abs_repos
    in_workspace = abs_path.startswith(workspace_prefix) or abs_path == abs_workspace

    if not (in_repos or in_workspace):
        raise HTTPException(
            status_code=403,
            detail="Access denied: Path lies outside authorized directory boundaries."
        )

    return abs_path
