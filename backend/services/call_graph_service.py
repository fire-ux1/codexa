import ast


def walk_exclude_nested_scopes(node):
    """Walks the AST tree starting at `node`, but does not descend into inner functions or classes."""
    todo = [node]
    while todo:
        curr = todo.pop(0)
        yield curr
        # Don't descend into child function/class definitions if we are not at the root node
        if curr is not node and isinstance(
            curr, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)
        ):
            continue
        for child in ast.iter_child_nodes(curr):
            todo.append(child)


def extract_function_calls(code: str):

    graph = {}

    try:
        tree = ast.parse(code)

        class CallGraphVisitor(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                function_name = node.name

                graph[function_name] = []

                for child in walk_exclude_nested_scopes(node):
                    if isinstance(child, ast.Call):
                        if isinstance(child.func, ast.Name):
                            graph[function_name].append(child.func.id)

                        elif isinstance(child.func, ast.Attribute):
                            call_name = child.func.attr

                            if call_name not in {"post", "get", "put", "delete"}:
                                graph[function_name].append(call_name)
                self.generic_visit(node)

            def visit_AsyncFunctionDef(self, node):
                self.visit_FunctionDef(node)

        CallGraphVisitor().visit(tree)

    except Exception as e:
        print(f"Call Graph Error: {e}")

    return graph
