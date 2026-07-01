from git import Repo
import os
import json
from services.llm_service import generate_answer

def get_repo_obj(repo_path: str) -> Repo:
    """Helper to load a Repo object and verify its path constraint."""
    if not repo_path:
        raise ValueError("Repository path is required")
    
    abs_path = os.path.abspath(repo_path)
    abs_repos = os.path.abspath("repos")
    
    if not abs_path.startswith(abs_repos):
        raise PermissionError("Access denied: path is outside the repositories directory")
        
    if not os.path.isdir(abs_path) or not os.path.exists(os.path.join(abs_path, ".git")):
        raise ValueError(f"Not a valid git repository: {repo_path}")
        
    return Repo(abs_path)

def get_repo_status(repo_path: str):
    """Retrieves basic status: current branch, changes, staged, unstaged, untracked."""
    try:
        repo = get_repo_obj(repo_path)
        
        # Get active branch name, handle detached HEAD
        try:
            active_branch = repo.active_branch.name
        except TypeError:
            active_branch = "HEAD (detached)"
            
        is_dirty = repo.is_dirty()
        
        # Staged files: diff between index and HEAD
        staged_files = []
        try:
            staged_diff = repo.index.diff("HEAD")
            for diff in staged_diff:
                # diff.a_path or diff.b_path depending on change type
                path = diff.a_path or diff.b_path
                if path not in staged_files:
                    staged_files.append(path)
        except Exception:
            pass # Repository might not have a HEAD commit yet
            
        # Unstaged files: diff between index and working tree
        unstaged_files = []
        unstaged_diff = repo.index.diff(None)
        for diff in unstaged_diff:
            path = diff.a_path or diff.b_path
            if path not in unstaged_files:
                unstaged_files.append(path)
                
        # Untracked files
        untracked_files = repo.untracked_files
        
        # Get all branches
        branches = []
        try:
            branches = [b.name for b in repo.branches]
        except Exception:
            pass
            
        return {
            "status": "success",
            "active_branch": active_branch,
            "is_dirty": is_dirty,
            "staged": staged_files,
            "unstaged": unstaged_files,
            "untracked": untracked_files,
            "branches": branches
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_commit_history(repo_path: str, file_path: str = None, max_count: int = 20):
    """Retrieves history of commits, optionally filtered by a specific file."""
    try:
        repo = get_repo_obj(repo_path)
        
        kwargs = {"max_count": max_count}
        if file_path:
            # Paths should be relative to the repo root
            rel_file_path = os.path.relpath(os.path.abspath(file_path), repo.working_dir)
            kwargs["paths"] = rel_file_path
            
        commits = []
        # If repo has no commits, iter_commits throws ValueError
        try:
            for commit in repo.iter_commits(**kwargs):
                commits.append({
                    "hexsha": commit.hexsha,
                    "author": commit.author.name,
                    "email": commit.author.email,
                    "date": commit.committed_datetime.isoformat(),
                    "message": commit.message,
                    "summary": commit.summary
                })
        except ValueError:
            pass # No commits yet
            
        return {
            "status": "success",
            "commits": commits
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_git_diff(repo_path: str, target: str = None, source: str = None):
    """
    Computes a git diff.
    - If target and source are omitted: unstaged working tree diff.
    - If target="HEAD" and source is omitted: staged diff.
    - If target is a commit hexsha / branch: diff between working tree and target.
    - If both target and source are provided: diff between target and source.
    """
    try:
        repo = get_repo_obj(repo_path)
        
        if not target and not source:
            # Unstaged changes in working tree
            diff_text = repo.git.diff()
        elif target == "HEAD" and not source:
            # Staged changes
            diff_text = repo.git.diff("--cached")
        elif target and not source:
            # Diff between active workspace / index and a commit/branch
            diff_text = repo.git.diff(target)
        else:
            # Diff between target branch/commit and source branch/commit
            diff_text = repo.git.diff(target, source)
            
        return {
            "status": "success",
            "diff": diff_text
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def git_blame(repo_path: str, file_path: str):
    """Compiles git blame line mappings for a file."""
    try:
        repo = get_repo_obj(repo_path)
        abs_file = os.path.abspath(file_path)
        rel_file = os.path.relpath(abs_file, repo.working_dir)
        
        blame_data = []
        blame_lines = repo.git.blame("-t", rel_file).splitlines()
        
        for idx, line in enumerate(blame_lines):
            # Typical git blame line format: 
            # commit_hash (author_name datetime line_number) line_content
            parts = line.split(")", 1)
            meta = parts[0]
            content = parts[1] if len(parts) > 1 else ""
            
            # Simple parsing of author and commit info
            meta_parts = meta.split("(")
            commit_hash = meta_parts[0].strip().split()[0]
            
            author_date = meta_parts[1] if len(meta_parts) > 1 else "Unknown Author"
            # Extract author and date
            author = author_date.strip()
            
            blame_data.append({
                "line": idx + 1,
                "commit": commit_hash,
                "author": author,
                "content": content
            })
            
        return {
            "status": "success",
            "blame": blame_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def generate_commit_msg(repo_path: str) -> str:
    """Suggests a commit message based on the staged diff."""
    try:
        repo = get_repo_obj(repo_path)
        staged_diff = repo.git.diff("--cached")
        
        if not staged_diff.strip():
            return "No staged changes to generate a commit message for."
            
        # Limit size of diff passed to LLM
        if len(staged_diff) > 10000:
            staged_diff = staged_diff[:10000] + "\n... [Diff Truncated] ..."
            
        prompt = f"""You are an AI git assistant.
Generate a concise, professional, conventional commit message based on the following git diff of staged changes.
Format standard: `<type>(<scope>): <subject>` followed by a blank line and description points if necessary.

Staged Changes:
```diff
{staged_diff}
```

Return ONLY the plain commit message text, with no markdown fences, no other explanation, and no prefix words.
"""
        msg = generate_answer(prompt)
        return msg.strip()
    except Exception as e:
        return f"Failed to generate commit message: {str(e)}"

def explain_commit(repo_path: str, hexsha: str):
    """Asks the LLM to explain the changes made in a specific commit."""
    try:
        repo = get_repo_obj(repo_path)
        commit = repo.commit(hexsha)
        
        # Get commit diff relative to parent
        if commit.parents:
            diff_text = repo.git.show(hexsha)
        else:
            # First commit, no parent
            diff_text = repo.git.show(hexsha)
            
        if len(diff_text) > 12000:
            diff_text = diff_text[:12000] + "\n... [Diff Truncated] ..."
            
        prompt = f"""You are an expert code intelligence assistant.
Analyze the following git commit and explain:
1. What changes were made.
2. The logic and purpose of the changes.
3. Any architectural impact or potential regression risk.

Commit Info:
Author: {commit.author.name} <{commit.author.email}>
Date: {commit.committed_datetime.isoformat()}
Message: {commit.message}

Git Show Output:
```diff
{diff_text}
```

Provide your explanation in clear, beautifully formatted Markdown.
"""
        explanation = generate_answer(prompt)
        return {"status": "success", "explanation": explanation}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def review_pull_request(repo_path: str, source: str, target: str):
    """
    Simulates a Pull Request review by comparing source branch against target branch.
    Runs LLM audits for style, bugs, OWASP security, performance, and breaking changes.
    """
    try:
        repo = get_repo_obj(repo_path)
        
        # Compute diff target..source
        diff_text = repo.git.diff(target, source)
        
        if not diff_text.strip():
            return {
                "status": "success",
                "summary": "No changes detected between the selected branches.",
                "quality_score": 100,
                "risks": []
            }
            
        if len(diff_text) > 12000:
            diff_text = diff_text[:12000] + "\n... [Diff Truncated] ..."
            
        prompt = f"""You are an elite Pull Request reviewer.
Perform a strict code audit of the following git diff representing changes to merge from branch `{source}` into branch `{target}`.

Analyze for:
1. Code Quality & Bugs (Readability, style, logic errors, edge cases)
2. OWASP Security (SQL injection, XSS, insecure APIs, secrets exposure)
3. Performance Risks (Computation, memory, leaks, bad algorithms)
4. Breaking Changes (Modified API interfaces, schema changes, database migrations)

Provide your review in a structured JSON format exactly as follows:
{{
    "summary": "High-level summary of the PR and changes",
    "quality_score": <int between 0 and 100 representing overall quality>,
    "recommendations": [
        "First specific recommendation",
        "Second specific recommendation"
    ],
    "issues": [
        {{
            "file": "path/to/file.py",
            "category": "Security" | "Performance" | "Quality" | "Breaking Change",
            "description": "Specific description of the issue",
            "severity": "High" | "Medium" | "Low"
        }}
    ],
    "release_notes": "Summary of release notes / changelog"
}}

Git Diff:
```diff
{diff_text}
```

Return ONLY the raw JSON structure, with no wrapper, markdown backticks, or introduction text. Ensure it is valid, parseable JSON.
"""
        res_text = generate_answer(prompt).strip()
        
        # Clean potential markdown block wrappers
        if res_text.startswith("```"):
            lines = res_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            res_text = "\n".join(lines).strip()
            
        try:
            review_json = json.loads(res_text)
            return {"status": "success", **review_json}
        except json.JSONDecodeError:
            # Fallback if LLM output was not perfectly formed JSON
            return {
                "status": "success",
                "summary": "Failed to parse structured review JSON, outputting raw analysis.",
                "quality_score": 70,
                "recommendations": [],
                "issues": [{"file": "unknown", "category": "Quality", "description": res_text, "severity": "Medium"}],
                "release_notes": "PR analysis complete."
            }
            
    except Exception as e:
        return {"status": "error", "message": str(e)}
