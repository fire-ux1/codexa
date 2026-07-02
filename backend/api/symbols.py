import os
import ast
import re
from fastapi import APIRouter, HTTPException
from utils.security import validate_safe_path

router = APIRouter()


def parse_python_symbols(code: str):
    symbols = []
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                symbols.append(
                    {
                        "name": node.name,
                        "kind": "class",
                        "line": node.lineno,
                        "column": node.col_offset + 1,
                    }
                )
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                symbols.append(
                    {
                        "name": node.name,
                        "kind": "function",
                        "line": node.lineno,
                        "column": node.col_offset + 1,
                    }
                )
    except Exception as e:
        print(f"Error parsing Python symbols: {e}")
    return symbols


def parse_generic_symbols(code: str, ext: str):
    symbols = []
    lines = code.splitlines()

    # Generic regex mappings
    # JavaScript/TypeScript
    if ext in {".js", ".jsx", ".ts", ".tsx"}:
        patterns = [
            (re.compile(r"\bclass\s+([A-Za-z0-9_]+)"), "class"),
            (re.compile(r"\bfunction\s+([A-Za-z0-9_]+)"), "function"),
            (
                re.compile(
                    r"\bconst\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>"
                ),
                "function",
            ),
            (
                re.compile(
                    r"\bexport\s+(?:default\s+)?(?:function|class)\s+([A-Za-z0-9_]+)"
                ),
                "function",
            ),
        ]
    elif ext in {".go"}:
        patterns = [
            (re.compile(r"\btype\s+([A-Za-z0-9_]+)\s+struct"), "class"),
            (re.compile(r"\bfunc\s+([A-Za-z0-9_]+)\s*\("), "function"),
            (re.compile(r"\bfunc\s+\([^)]*\)\s*([A-Za-z0-9_]+)\s*\("), "method"),
        ]
    elif ext in {".rs"}:
        patterns = [
            (re.compile(r"\bstruct\s+([A-Za-z0-9_]+)"), "class"),
            (re.compile(r"\bimpl\s+([A-Za-z0-9_]+)"), "class"),
            (re.compile(r"\bfn\s+([A-Za-z0-9_]+)\b"), "function"),
        ]
    elif ext in {".java", ".cpp", ".c", ".h"}:
        patterns = [
            (re.compile(r"\bclass\s+([A-Za-z0-9_]+)"), "class"),
            (re.compile(r"\binterface\s+([A-Za-z0-9_]+)"), "class"),
            (
                re.compile(
                    r"\b(?:public|private|protected|static|\s) +[A-Za-z0-9_<>]+\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{"
                ),
                "function",
            ),
        ]
    else:
        patterns = []

    for idx, line in enumerate(lines):
        for pattern, kind in patterns:
            match = pattern.search(line)
            if match:
                symbols.append(
                    {
                        "name": match.group(1),
                        "kind": kind,
                        "line": idx + 1,
                        "column": match.start() + 1,
                    }
                )
    return symbols


@router.get("")
def get_file_symbols(path: str):
    abs_path = validate_safe_path(path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")

    with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
        code = f.read()

    ext = os.path.splitext(abs_path)[1].lower()
    if ext == ".py":
        symbols = parse_python_symbols(code)
    else:
        symbols = parse_generic_symbols(code, ext)

    return symbols
