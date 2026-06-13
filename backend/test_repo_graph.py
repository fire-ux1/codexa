from services.repository_graph_service import (
    build_repository_graph
)

graph = build_repository_graph(
    "repos/codepilot-ai"
)

for function, calls in graph.items():

    print(function)

    print(" -> ", calls)

    print()