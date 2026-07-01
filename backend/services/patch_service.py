import os
import json
import difflib
from services.llm_service import generate_answer_stream


def calculate_diff(original: str, modified: str, filename: str = "file") -> str:
    """Computes a unified diff between original and modified content."""
    original_lines = original.splitlines(keepends=True)
    modified_lines = modified.splitlines(keepends=True)
    diff = difflib.unified_diff(
        original_lines, modified_lines, fromfile=f"a/{filename}", tofile=f"b/{filename}"
    )
    return "".join(diff)


def handle_patch_generation_stream(
    repo_path: str, file_path: str, selection: str, instruction: str
):
    """
    Queries the LLM to generate a code modification patch based on the instruction.
    Streams back JSON-lines containing 'summary', 'code', and 'diff' content.
    """
    # 1. Read the active file content
    original_file_content = ""
    if file_path:
        abs_path = os.path.abspath(file_path)
        if os.path.exists(abs_path) and os.path.isfile(abs_path):
            try:
                with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                    original_file_content = f.read()
            except Exception as e:
                yield (
                    json.dumps({"type": "error", "message": f"Read error: {str(e)}"})
                    + "\n"
                )
                return

    # Decide if we are modifying a selection or the entire file
    has_selection = bool(selection and selection.strip())
    repo_name = os.path.basename(repo_path) if repo_path else "Workspace"

    # 2. Build the LLM prompt
    context_code_prompt = ""
    if has_selection:
        context_code_prompt = f"""
Active File Content (Context):
```
{original_file_content}
```

Active Selected Code to modify:
```
{selection}
```
"""
    else:
        context_code_prompt = f"""
Active File Content to modify:
```
{original_file_content}
```
"""

    prompt = f"""You are an expert AI patch generation agent (CodePilot AI).
Your goal is to modify the provided code according to the instruction: "{instruction}".

We are working in:
Repository: {repo_name}
File: {file_path}

{context_code_prompt}

You MUST respond strictly in the following format:
[SUMMARY]
<Brief explanation of the changes made and why, in 1-3 lines>
[CODE]
<The complete updated code block. If a selection was provided, output only the updated selection. If no selection was provided, output the entire updated file content. Do NOT wrap this code block in markdown code fences like ```.>
"""

    # 3. Stream from LLM and parse sections
    mode = "summary"
    summary_text = ""
    code_text = ""

    try:
        for token in generate_answer_stream(prompt):
            if mode == "summary":
                temp = summary_text + token
                if "[CODE]" in temp:
                    parts = temp.split("[CODE]")
                    summary_delta = parts[0][len(summary_text) :]
                    if summary_delta:
                        # Clean summary token
                        yield_token = summary_delta
                        if "[SUMMARY]" in yield_token:
                            yield_token = yield_token.replace("[SUMMARY]", "").lstrip()
                        yield (
                            json.dumps({"type": "summary", "content": yield_token})
                            + "\n"
                        )

                    summary_text = parts[0]
                    mode = "code"

                    code_delta = parts[1].lstrip()
                    if code_delta:
                        yield json.dumps({"type": "code", "content": code_delta}) + "\n"
                        code_text = code_delta
                else:
                    yield_token = token
                    if not summary_text:
                        if token.startswith("[SUMMARY]"):
                            yield_token = token[len("[SUMMARY]") :].lstrip()
                        elif "[SUMMARY]" in token:
                            yield_token = token.replace("[SUMMARY]", "").lstrip()

                    yield json.dumps({"type": "summary", "content": yield_token}) + "\n"
                    summary_text += token
            else:
                yield json.dumps({"type": "code", "content": token}) + "\n"
                code_text += token

    except Exception as e:
        yield (
            json.dumps({"type": "error", "message": f"LLM stream error: {str(e)}"})
            + "\n"
        )
        return

    # 4. Finalize formatting and compute diff
    final_summary = summary_text.replace("[SUMMARY]", "").strip()
    final_code = code_text.strip()

    # Clean markdown code fences if outputted
    if final_code.startswith("```"):
        lines = final_code.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        final_code = "\n".join(lines).strip()

    # Merge final code back into file content if selection was modified
    if has_selection:
        # Note: replace selection with modified block once
        modified_file_content = original_file_content.replace(selection, final_code, 1)
    else:
        modified_file_content = final_code

    # Calculate unified diff of the entire file
    filename = os.path.basename(file_path) if file_path else "file"
    diff_str = calculate_diff(original_file_content, modified_file_content, filename)

    # Yield final results
    yield json.dumps({"type": "diff", "content": diff_str}) + "\n"
    yield (
        json.dumps(
            {
                "type": "done",
                "summary": final_summary,
                "original": original_file_content,
                "updated": modified_file_content,
                "diff": diff_str,
            }
        )
        + "\n"
    )
