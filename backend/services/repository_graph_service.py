import os
import ast

SUPPORTED_EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json"}


def resolve_import(
    import_name: str, current_file: str, all_files: set[str]
) -> str | None:
    """Resolve an import string (like services.scanner_service) to a local relative path."""
    parts = import_name.split(".")

    # 1. Try absolute import relative to repository root
    candidate = "/".join(parts) + ".py"
    if candidate in all_files:
        return candidate
    candidate_init = "/".join(parts) + "/__init__.py"
    if candidate_init in all_files:
        return candidate_init

    # 2. Try relative import relative to the current file's directory
    cur_dir = os.path.dirname(current_file)
    if cur_dir:
        candidate_rel = (cur_dir + "/" + "/".join(parts)).replace("\\", "/") + ".py"
        if candidate_rel in all_files:
            return candidate_rel
        candidate_rel_init = (cur_dir + "/" + "/".join(parts)).replace(
            "\\", "/"
        ) + "/__init__.py"
        if candidate_rel_init in all_files:
            return candidate_rel_init

    # 3. Try checking last part of module path
    if parts:
        last_part = parts[-1] + ".py"
        for f in all_files:
            if f.endswith("/" + last_part) or f == last_part:
                return f

    return None


def generate_repository_graph(repo_path: str):
    """Generate structured graph data (nodes, edges) suitable for React Flow."""
    nodes = []
    edges = []
    all_files_set = set()
    file_metadata = {}

    # Scan files first to gather all node candidates
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [
            d
            for d in dirs
            if d not in {".git", "__pycache__", "venv", "node_modules", "dist"}
        ]

        for file in files:
            ext = os.path.splitext(file)[1]
            if ext in SUPPORTED_EXTENSIONS:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, repo_path).replace("\\", "/")
                all_files_set.add(rel_path)

                try:
                    size = os.path.getsize(file_path)
                except Exception:
                    size = 0

                file_metadata[rel_path] = {
                    "path": file_path,
                    "extension": ext,
                    "size": size,
                    "name": file,
                }

    # Create nodes
    for rel_path, meta in file_metadata.items():
        nodes.append(
            {
                "id": rel_path,
                "label": meta["name"],
                "type": "file",
                "data": {
                    "path": meta["path"],
                    "extension": meta["extension"],
                    "size": meta["size"],
                },
            }
        )

    # Analyze Python imports to build edges
    edges_set = set()
    for rel_path, meta in file_metadata.items():
        if not rel_path.endswith(".py"):
            continue

        try:
            with open(meta["path"], "r", encoding="utf-8", errors="ignore") as f:
                code = f.read()

            tree = ast.parse(code)
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
                    edge_key = (rel_path, resolved)
                    if edge_key not in edges_set:
                        edges_set.add(edge_key)
                        edges.append(
                            {
                                "id": f"e_{rel_path.replace('/', '_')}_to_{resolved.replace('/', '_')}",
                                "source": rel_path,
                                "target": resolved,
                            }
                        )

        except Exception as e:
            print(f"Graph Error parsing imports for {rel_path}: {e}")

    return {"nodes": nodes, "edges": edges}
