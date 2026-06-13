from services.scanner_service import scan_repository
from services.reader_service import read_file
from services.call_graph_service import (
    extract_function_calls
)


def build_repository_graph(repo_path: str):

    graph = {}
    all_functions = set()

    scan_result = scan_repository(repo_path)

    # First pass: collect all functions
    for file in scan_result["files"]:

        if file["extension"] != ".py":
            continue

        content = read_file(file["path"])

        file_graph = extract_function_calls(content)

        all_functions.update(file_graph.keys())

        graph.update(file_graph)

    # Second pass: keep only internal calls
    filtered_graph = {}

    for func, calls in graph.items():

        filtered_graph[func] = [
            call
            for call in calls
            if call in all_functions
        ]

    return filtered_graph