import os
import ast
import re
import uuid
from services.scanner_service import scan_repository
from services.reader_service import read_file
from services.knowledge_graph.graph_storage import (
    clear_graph,
    insert_nodes,
    insert_edges,
)
from services.repository_graph_service import resolve_import


def parse_db_tables(code: str) -> list[str]:
    """Helper to find SQL database tables referenced in raw SQL query string patterns."""
    tables = []
    # Match patterns like: FROM table, JOIN table, INSERT INTO table, UPDATE table, DELETE FROM table
    patterns = [
        r"(?i)\bfrom\s+([a-zA-Z_][a-zA-Z0-9_]*)\b",
        r"(?i)\bjoin\s+([a-zA-Z_][a-zA-Z0-9_]*)\b",
        r"(?i)\binto\s+([a-zA-Z_][a-zA-Z0-9_]*)\b",
        r"(?i)\bupdate\s+([a-zA-Z_][a-zA-Z0-9_]*)\b",
        r"(?i)\bdelete\s+from\s+([a-zA-Z_][a-zA-Z0-9_]*)\b",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, code):
            tbl = match.group(1).lower()
            # Ignore standard SQL keywords that might be accidentally caught
            if tbl not in {
                "select",
                "insert",
                "update",
                "delete",
                "where",
                "set",
                "values",
                "left",
                "right",
                "inner",
                "outer",
            }:
                if tbl not in tables:
                    tables.append(tbl)
    return tables


def build_knowledge_graph(repo_path: str, repo_id: str):
    """
    Parses the repository structure and contents to build and persist
    a semantic knowledge graph in the SQLite database.
    """
    clear_graph(repo_id)

    scan_res = scan_repository(repo_path)
    files = scan_res["files"]

    nodes = []
    edges = []
    added_node_ids = set()

    def add_node(node):
        nodes.append(node)
        added_node_ids.add(node["id"])

    # 1. Create Repository Root Node
    repo_node_id = f"{repo_id}::repo"
    add_node(
        {
            "id": repo_node_id,
            "name": os.path.basename(repo_path.rstrip("/\\")),
            "type": "repository",
            "path": repo_path,
            "meta": {"files_count": len(files)},
        }
    )

    # Track sets of files and directories
    all_files_set = set()
    directories = set()

    for f in files:
        rel_path = os.path.relpath(f["path"], repo_path).replace("\\", "/")
        all_files_set.add(rel_path)

        # Collect directories
        parent = os.path.dirname(rel_path).replace("\\", "/")
        while parent:
            directories.add(parent)
            parent = os.path.dirname(parent).replace("\\", "/")

    # 2. Create Directory Nodes and CONTAINS edges from repo/parents
    for d in sorted(list(directories)):
        dir_node_id = f"{repo_id}::{d}"
        add_node(
            {
                "id": dir_node_id,
                "name": os.path.basename(d),
                "type": "folder",
                "path": d,
                "meta": {},
            }
        )

        # Link directory to parent directory or repo
        parent_dir = os.path.dirname(d).replace("\\", "/")
        if parent_dir:
            edges.append(
                {
                    "id": str(uuid.uuid4()),
                    "source": f"{repo_id}::{parent_dir}",
                    "target": dir_node_id,
                    "relation_type": "contains",
                }
            )
        else:
            edges.append(
                {
                    "id": str(uuid.uuid4()),
                    "source": repo_node_id,
                    "target": dir_node_id,
                    "relation_type": "contains",
                }
            )

    # Maps file_rel_path -> set of defined class names / functions
    defined_symbols_by_file = {}  # key: rel_path, value: set of names
    all_defined_functions = {}  # key: func_name, value: list of rel_paths

    # Track items for cross-referencing calls
    raw_calls = {}  # key: (rel_path, func_id), value: list of strings (calls)

    # 3. Create File Nodes and parse their symbols
    for f in files:
        rel_path = os.path.relpath(f["path"], repo_path).replace("\\", "/")
        file_node_id = f"{repo_id}::{rel_path}"

        # File details
        try:
            size = os.path.getsize(f["path"])
        except Exception:
            size = 0

        add_node(
            {
                "id": file_node_id,
                "name": f["name"],
                "type": "file",
                "path": rel_path,
                "meta": {"size": size, "extension": f["extension"]},
            }
        )

        # Link file to its parent directory or repo
        parent_dir = os.path.dirname(rel_path).replace("\\", "/")
        if parent_dir:
            edges.append(
                {
                    "id": str(uuid.uuid4()),
                    "source": f"{repo_id}::{parent_dir}",
                    "target": file_node_id,
                    "relation_type": "contains",
                }
            )
        else:
            edges.append(
                {
                    "id": str(uuid.uuid4()),
                    "source": repo_node_id,
                    "target": file_node_id,
                    "relation_type": "contains",
                }
            )

        defined_symbols_by_file[rel_path] = set()

        # Parse file contents if Python
        if f["extension"] == ".py":
            try:
                content = read_file(f["path"])
                tree = ast.parse(content)

                # Track classes, functions, variable defines, endpoints
                for node in ast.walk(tree):
                    # A. Classes
                    if isinstance(node, ast.ClassDef):
                        class_node_id = f"{file_node_id}::{node.name}"
                        add_node(
                            {
                                "id": class_node_id,
                                "name": node.name,
                                "type": "class",
                                "path": rel_path,
                                "meta": {"line": node.lineno},
                            }
                        )
                        edges.append(
                            {
                                "id": str(uuid.uuid4()),
                                "source": file_node_id,
                                "target": class_node_id,
                                "relation_type": "contains",
                            }
                        )
                        defined_symbols_by_file[rel_path].add(node.name)

                    # B. Functions (Top-level or inside classes)
                    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        # Determine if function is inside a class
                        parent_class = None
                        # Simple scope resolution finding class parents in AST traversal
                        for parent in ast.walk(tree):
                            if isinstance(parent, ast.ClassDef):
                                if node in parent.body:
                                    parent_class = parent.name
                                    break

                        func_display_name = (
                            f"{parent_class}.{node.name}" if parent_class else node.name
                        )
                        func_node_id = f"{file_node_id}::{func_display_name}"

                        add_node(
                            {
                                "id": func_node_id,
                                "name": func_display_name,
                                "type": "function",
                                "path": rel_path,
                                "meta": {"line": node.lineno},
                            }
                        )

                        # Link to class or file
                        if parent_class:
                            class_node_id = f"{file_node_id}::{parent_class}"
                            edges.append(
                                {
                                    "id": str(uuid.uuid4()),
                                    "source": class_node_id,
                                    "target": func_node_id,
                                    "relation_type": "contains",
                                }
                            )
                        else:
                            edges.append(
                                {
                                    "id": str(uuid.uuid4()),
                                    "source": file_node_id,
                                    "target": func_node_id,
                                    "relation_type": "contains",
                                }
                            )

                        defined_symbols_by_file[rel_path].add(func_display_name)
                        if func_display_name not in all_defined_functions:
                            all_defined_functions[func_display_name] = []
                        all_defined_functions[func_display_name].append(rel_path)

                        # Parse function body calls, db queries and endpoints
                        func_body_str = ""
                        try:
                            # Try to extract the block string representation
                            func_body_str = ast.get_source_segment(content, node) or ""
                        except Exception:
                            pass

                        # Detect DB Table Queries inside this function
                        if func_body_str:
                            db_tables = parse_db_tables(func_body_str)
                            for tbl in db_tables:
                                table_node_id = f"{repo_id}::db::{tbl}"
                                # Add table node (only once)
                                if table_node_id not in added_node_ids:
                                    add_node(
                                        {
                                            "id": table_node_id,
                                            "name": tbl.upper(),
                                            "type": "table",
                                            "path": "",
                                            "meta": {},
                                        }
                                    )
                                edges.append(
                                    {
                                        "id": str(uuid.uuid4()),
                                        "source": func_node_id,
                                        "target": table_node_id,
                                        "relation_type": "queries",
                                    }
                                )

                        # Detect API routes/endpoints via decorators
                        is_route = False
                        route_path = ""
                        methods = ["GET"]  # default

                        for dec in node.decorator_list:
                            # Match decorators like @app.get('/path'), @router.post, etc.
                            dec_str = ""
                            if isinstance(dec, ast.Call):
                                if isinstance(dec.func, ast.Attribute):
                                    dec_str = dec.func.attr
                                elif isinstance(dec.func, ast.Name):
                                    dec_str = dec.func.id

                                if dec_str.lower() in {
                                    "get",
                                    "post",
                                    "put",
                                    "delete",
                                    "route",
                                    "patch",
                                }:
                                    is_route = True
                                    if dec_str.lower() != "route":
                                        methods = [dec_str.upper()]

                                    # Extract path if argument is literal
                                    if dec.args and isinstance(
                                        dec.args[0], ast.Constant
                                    ):
                                        route_path = str(dec.args[0].value)

                            elif isinstance(dec, ast.Attribute):
                                if dec.attr.lower() in {
                                    "get",
                                    "post",
                                    "put",
                                    "delete",
                                    "route",
                                    "patch",
                                }:
                                    is_route = True
                                    methods = [dec.attr.upper()]

                        if is_route:
                            endpoint_name = f"{methods[0]} {route_path or '/'}"
                            endpoint_node_id = f"{repo_id}::api::{endpoint_name}"
                            if endpoint_node_id not in added_node_ids:
                                add_node(
                                    {
                                        "id": endpoint_node_id,
                                        "name": endpoint_name,
                                        "type": "endpoint",
                                        "path": route_path,
                                        "meta": {
                                            "methods": methods,
                                            "route": route_path,
                                        },
                                    }
                                )
                            edges.append(
                                {
                                    "id": str(uuid.uuid4()),
                                    "source": func_node_id,
                                    "target": endpoint_node_id,
                                    "relation_type": "exposes",
                                }
                            )

                        # Collect raw function calls for second pass
                        calls = []
                        for child in ast.walk(node):
                            if isinstance(child, ast.Call):
                                if isinstance(child.func, ast.Name):
                                    calls.append(child.func.id)
                                elif isinstance(child.func, ast.Attribute):
                                    calls.append(child.func.attr)
                        raw_calls[(rel_path, func_display_name)] = calls

                    # C. Variable Assignments / Defines
                    elif isinstance(node, ast.Assign):
                        for target in node.targets:
                            if isinstance(target, ast.Name):
                                var_name = target.id
                                var_node_id = f"{file_node_id}::var::{var_name}"
                                if var_node_id not in added_node_ids:
                                    add_node(
                                        {
                                            "id": var_node_id,
                                            "name": var_name,
                                            "type": "variable",
                                            "path": rel_path,
                                            "meta": {"line": node.lineno},
                                        }
                                    )
                                    edges.append(
                                        {
                                            "id": str(uuid.uuid4()),
                                            "source": file_node_id,
                                            "target": var_node_id,
                                            "relation_type": "defines",
                                        }
                                    )

                # D. Imports (Cross-file dependencies)
                imports = []
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for name in node.names:
                            imports.append(name.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module)

                for imp in imports:
                    resolved = resolve_import(imp, rel_path, all_files_set)
                    if resolved and resolved != rel_path:
                        # Add node for import if needed (already created as file)
                        edges.append(
                            {
                                "id": str(uuid.uuid4()),
                                "source": file_node_id,
                                "target": f"{repo_id}::{resolved}",
                                "relation_type": "imports",
                            }
                        )

            except Exception as e:
                print(f"Graph Builder parsing error for {rel_path}: {e}")

    # 4. Resolve Function CALLS relationships
    for (file_rel_path, func_name), calls in raw_calls.items():
        source_func_id = f"{repo_id}::{file_rel_path}::{func_name}"

        for call in calls:
            resolved_target_id = None

            # Match A: defined in same file
            if call in defined_symbols_by_file[file_rel_path]:
                resolved_target_id = f"{repo_id}::{file_rel_path}::{call}"

            # Match B: Uniquely defined in repository
            if not resolved_target_id:
                matches = all_defined_functions.get(call, [])
                if len(matches) == 1:
                    resolved_target_id = f"{repo_id}::{matches[0]}::{call}"

            if resolved_target_id and resolved_target_id != source_func_id:
                edges.append(
                    {
                        "id": str(uuid.uuid4()),
                        "source": source_func_id,
                        "target": resolved_target_id,
                        "relation_type": "calls",
                    }
                )

    # Save to SQLite knowledge graph store
    insert_nodes(repo_id, nodes)
    insert_edges(repo_id, edges)
    print(
        f"Knowledge Graph successfully built: {len(nodes)} nodes, {len(edges)} edges saved."
    )
