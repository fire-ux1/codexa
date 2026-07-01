import os
import ast
import re
import json
from services.scanner_service import scan_repository

class ComplexityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.complexity = 1  # Base complexity is 1

    def visit_If(self, node):
        self.complexity += 1
        self.generic_visit(node)

    def visit_While(self, node):
        self.complexity += 1
        self.generic_visit(node)

    def visit_For(self, node):
        self.complexity += 1
        self.generic_visit(node)

    def visit_AsyncFor(self, node):
        self.complexity += 1
        self.generic_visit(node)

    def visit_ExceptHandler(self, node):
        self.complexity += 1
        self.generic_visit(node)

    def visit_With(self, node):
        self.complexity += 1
        self.generic_visit(node)

    def visit_AsyncWith(self, node):
        self.complexity += 1
        self.generic_visit(node)

    def visit_BoolOp(self, node):
        # e.g., "a and b" adds 1 for each operand after the first
        self.complexity += len(node.values) - 1
        self.generic_visit(node)

    def visit_Try(self, node):
        # Try itself doesn't add complexity, but handlers do
        self.generic_visit(node)

def calculate_python_file_metrics(file_path: str):
    """Parses a Python file using AST and returns metrics: functions, classes, imports, function details."""
    metrics = {
        "classes": 0,
        "functions": 0,
        "imports": 0,
        "function_lengths": [],
        "complexities": []
    }
    
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        if not content.strip():
            return metrics

        # Parse AST
        tree = ast.parse(content)
        
        # Count classes, functions, imports
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                metrics["classes"] += 1
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                metrics["functions"] += 1
                loc = node.end_lineno - node.lineno + 1
                metrics["function_lengths"].append(loc)
                
                # Cyclomatic complexity
                visitor = ComplexityVisitor()
                visitor.visit(node)
                metrics["complexities"].append(visitor.complexity)
            elif isinstance(node, ast.Import):
                metrics["imports"] += len(node.names)
            elif isinstance(node, ast.ImportFrom):
                metrics["imports"] += len(node.names)

    except Exception as e:
        print(f"Error parsing Python file {file_path}: {e}")

    return metrics

def calculate_general_file_lines(file_path: str):
    """Returns lines of code count for general files."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

def get_repository_analytics(repo_path: str):
    """Calculates all repository dashboard analytics."""
    scan_res = scan_repository(repo_path)
    files = scan_res["files"]

    # Basic tallies
    files_indexed = len(files)
    languages = {}
    total_classes = 0
    total_functions = 0
    total_imports = 0
    function_lengths = []
    complexities = []
    
    largest_files_candidates = []
    folder_sizes = {}
    folder_file_counts = {}

    for file in files:
        file_path = file["path"]
        ext = file["extension"]
        rel_path = os.path.relpath(file_path, repo_path).replace("\\", "/")
        
        # File sizes / folder sizes aggregation
        try:
            size_bytes = os.path.getsize(file_path)
        except Exception:
            size_bytes = 0
            
        # Get lines of code
        lines_count = calculate_general_file_lines(file_path)
        
        # Aggregate languages
        languages[ext] = languages.get(ext, 0) + 1
        
        # Parse Python files for deep AST metrics
        if ext == ".py":
            py_metrics = calculate_python_file_metrics(file_path)
            total_classes += py_metrics["classes"]
            total_functions += py_metrics["functions"]
            total_imports += py_metrics["imports"]
            function_lengths.extend(py_metrics["function_lengths"])
            complexities.extend(py_metrics["complexities"])
        elif ext in {".js", ".jsx", ".ts", ".tsx"}:
            # Simple regex search for JS/TS imports, functions, classes
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    js_code = f.read()
                imports_count = len(re.findall(r"\bimport\b", js_code))
                func_count = len(re.findall(r"\bfunction\b|=>", js_code))
                class_count = len(re.findall(r"\bclass\b", js_code))
                total_imports += imports_count
                total_functions += func_count
                total_classes += class_count
            except Exception:
                pass

        largest_files_candidates.append({
            "path": rel_path,
            "name": file["name"],
            "extension": ext,
            "lines": lines_count,
            "size": size_bytes
        })

        # Folder hierarchy tracking
        dir_name = os.path.dirname(rel_path) or "root"
        folder_sizes[dir_name] = folder_sizes.get(dir_name, 0) + size_bytes
        folder_file_counts[dir_name] = folder_file_counts.get(dir_name, 0) + 1

    # Average metrics
    avg_func_length = round(sum(function_lengths) / len(function_lengths), 1) if function_lengths else 0
    avg_complexity = round(sum(complexities) / len(complexities), 1) if complexities else 1

    # Largest Files & Folders sorting
    largest_files = sorted(largest_files_candidates, key=lambda x: x["size"], reverse=True)[:5]
    largest_folders = sorted(
        [{"path": k, "size": v, "count": folder_file_counts[k]} for k, v in folder_sizes.items()],
        key=lambda x: x["size"],
        reverse=True
    )[:5]

    # Dependency Count scanner
    dependency_count = 0
    requirements_path = os.path.join(repo_path, "requirements.txt")
    package_path = os.path.join(repo_path, "package.json")
    
    if os.path.exists(requirements_path):
        try:
            with open(requirements_path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        dependency_count += 1
        except Exception:
            pass
    elif os.path.exists(package_path):
        try:
            with open(package_path, "r", encoding="utf-8", errors="ignore") as f:
                pkg_data = json.load(f)
                dep = pkg_data.get("dependencies", {})
                dev_dep = pkg_data.get("devDependencies", {})
                dependency_count = len(dep) + len(dev_dep)
        except Exception:
            pass

    # Language distribution list for pie/bar chart
    lang_distribution = [{"language": k, "files": v} for k, v in languages.items()]

    # Cyclomatic complexity histogram
    complexity_histogram = {
        "Simple (1-5)": sum(1 for c in complexities if c <= 5),
        "Moderate (6-10)": sum(1 for c in complexities if 5 < c <= 10),
        "Complex (11+)": sum(1 for c in complexities if c > 10)
    }

    # Calculate Repository Health Score (out of 100)
    # Simple rule-based calculation: penalty for complex functions, large files
    large_files_count = sum(1 for f in largest_files_candidates if f["lines"] > 600)
    health_penalty = (avg_complexity - 2) * 8 + (large_files_count * 15)
    health_score = max(35, min(100, int(100 - health_penalty)))

    return {
        "files_indexed": files_indexed,
        "languages": lang_distribution,
        "functions": total_functions,
        "classes": total_classes,
        "imports": total_imports,
        "largest_files": largest_files,
        "largest_folders": largest_folders,
        "dependency_count": dependency_count,
        "average_function_length": avg_func_length,
        "cyclomatic_complexity": avg_complexity,
        "complexity_histogram": [{"range": k, "count": v} for k, v in complexity_histogram.items()],
        "repository_health": health_score,
    }
