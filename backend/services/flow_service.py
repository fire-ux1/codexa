from services.repository_graph_service import (
    build_repository_graph
)


def generate_flow(repo_path: str):

    graph = build_repository_graph(repo_path)

    flows = []

    for function, calls in graph.items():

        if not calls:
            continue

        flow = function

        for call in calls:

            flow += f"\n    ↓\n{call}"

        flows.append(flow)

    return "\n\n".join(flows)