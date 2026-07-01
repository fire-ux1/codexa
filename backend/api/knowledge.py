from fastapi import APIRouter, HTTPException, Query
from services.knowledge_graph.graph_storage import get_graph
from services.knowledge_graph.graph_query import (
    find_dependers,
    find_cycles,
    get_critical_nodes,
    find_path
)

router = APIRouter()

@router.get("/graph")
def get_react_flow_graph(repo_id: str = Query(..., description="Repository database identifier")):
    """Retrieves knowledge graph nodes and edges pre-formatted for React Flow visualization."""
    res = get_graph(repo_id)
    nodes = res["nodes"]
    edges = res["edges"]

    # Basic grid position formatting for React Flow compatibility
    formatted_nodes = []
    for idx, node in enumerate(nodes):
        row = idx // 8
        col = idx % 8
        formatted_nodes.append({
            "id": node["id"],
            "type": "default", # React flow node types
            "data": {
                "label": f"{node['type'].upper()}: {node['name']}",
                "name": node["name"],
                "type": node["type"],
                "path": node["path"],
                "meta": node["meta"]
            },
            "position": {"x": col * 200, "y": row * 150},
            "style": {
                "background": get_node_color(node["type"]),
                "color": "#fff",
                "border": "1px solid rgba(255,255,255,0.1)",
                "borderRadius": "8px",
                "fontSize": "10px",
                "fontFamily": "monospace"
            }
        })

    # Format edges to include simple animations/styles
    formatted_edges = []
    for edge in edges:
        formatted_edges.append({
            "id": edge["id"],
            "source": edge["source"],
            "target": edge["target"],
            "label": edge["relation_type"],
            "animated": edge["relation_type"] in {"calls", "queries"},
            "style": {"stroke": get_edge_color(edge["relation_type"])}
        })

    return {
        "nodes": formatted_nodes,
        "edges": formatted_edges
    }

@router.get("/query")
def run_semantic_graph_query(
    repo_id: str = Query(...),
    query_type: str = Query(..., description="Query category: 'dependers' or 'path'"),
    node: str = Query(..., description="Target node identifier or name"),
    target_node: str = Query(None, description="End node identifier or name for path queries")
):
    """Answers semantic code dependency questions using graph traversal searches."""
    if query_type == "dependers":
        return find_dependers(repo_id, node)
    elif query_type == "path":
        if not target_node:
            raise HTTPException(status_code=400, detail="Target node is required for path query")
        return find_path(repo_id, node, target_node)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported query type: {query_type}")

@router.get("/critical")
def get_critical_graph_metrics(repo_id: str = Query(...)):
    """Calculates code coupling heatmaps and circular dependencies cycles."""
    cycles_res = find_cycles(repo_id)
    critical_res = get_critical_nodes(repo_id)
    return {
        "cycles": cycles_res,
        "critical": critical_res
    }

def get_node_color(node_type: str) -> str:
    colors = {
        "repository": "rgba(99, 102, 241, 0.4)",  # Indigo
        "folder": "rgba(107, 114, 128, 0.4)",      # Gray
        "file": "rgba(59, 130, 246, 0.4)",        # Blue
        "class": "rgba(236, 72, 153, 0.4)",       # Pink
        "function": "rgba(139, 92, 246, 0.4)",    # Purple
        "variable": "rgba(245, 158, 11, 0.4)",    # Amber
        "endpoint": "rgba(16, 185, 129, 0.4)",    # Emerald
        "table": "rgba(239, 68, 68, 0.4)",        # Red
    }
    return colors.get(node_type, "rgba(255, 255, 255, 0.2)")

def get_edge_color(relation_type: str) -> str:
    colors = {
        "contains": "#4b5563",
        "imports": "#3b82f6",
        "calls": "#8b5cf6",
        "queries": "#ef4444",
        "exposes": "#10b981",
        "defines": "#f59e0b",
    }
    return colors.get(relation_type, "#9ca3af")
