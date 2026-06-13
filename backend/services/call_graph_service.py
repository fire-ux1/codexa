import ast


def extract_function_calls(code: str):

    graph = {}

    try:

        tree = ast.parse(code)

        for node in ast.walk(tree):

            if isinstance(node, ast.FunctionDef):

                function_name = node.name

                graph[function_name] = []

                for child in ast.walk(node):

                    if isinstance(child, ast.Call):

                        if isinstance(child.func, ast.Name):

                            graph[function_name].append(
                                child.func.id
                            )

                        elif isinstance(
                            child.func,
                            ast.Attribute
                        ):

                            call_name = child.func.attr

                            if call_name not in {
                                    "post",
                                    "get",
                                    "put",
                                    "delete"
                                }:
                                    graph[function_name].append(
                                        call_name
                                    )

    except Exception as e:

        print(f"Call Graph Error: {e}")

    return graph