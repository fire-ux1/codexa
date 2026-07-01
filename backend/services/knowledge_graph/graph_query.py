from collections import deque
from services.knowledge_graph.graph_storage import get_graph

def build_adjacency_lists(nodes, edges):
    """
    Builds forward and backward adjacency representations.
    adj: source -> list of (target, relation_type)
    rev_adj: target -> list of (source, relation_type)
    """
    adj = {n["id"]: [] for n in nodes}
    rev_adj = {n["id"]: [] for n in nodes}
    
    for edge in edges:
        s = edge["source"]
        t = edge["target"]
        rel = edge["relation_type"]
        
        # Ensure node ids exist in structures
        if s in adj and t in adj:
            adj[s].append((t, rel))
            rev_adj[t].append((s, rel))
            
    return adj, rev_adj

def find_dependers(repo_id: str, node_id: str):
    """
    Finds all elements that transitively depend on the given node
    (i.e., those that have a path of calls/imports/contains pointing to X).
    """
    graph_data = get_graph(repo_id)
    nodes = graph_data["nodes"]
    edges = graph_data["edges"]
    
    # Resolve node by name or partial string if full id not matches
    target_id = None
    for n in nodes:
        if n["id"] == node_id or n["name"] == node_id:
            target_id = n["id"]
            break
            
    if not target_id:
        return {"status": "error", "message": f"Node not found: {node_id}"}
        
    adj, rev_adj = build_adjacency_lists(nodes, edges)
    
    # Traverse backwards (following rev_adj) to find things that point to target_id
    visited = {target_id}
    queue = deque([target_id])
    
    dependers = []
    
    while queue:
        curr = queue.popleft()
        for parent, rel in rev_adj.get(curr, []):
            if parent not in visited:
                visited.add(parent)
                queue.append(parent)
                # Find details of node
                p_node = next((n for n in nodes if n["id"] == parent), None)
                if p_node:
                    dependers.append({
                        "id": p_node["id"],
                        "name": p_node["name"],
                        "type": p_node["type"],
                        "relation": rel
                    })
                    
    return {
        "status": "success",
        "target_node": next((n for n in nodes if n["id"] == target_id), None),
        "dependers": dependers
    }

def find_cycles(repo_id: str):
    """Detects circular dependency loops (specifically looking at imports or calls)."""
    graph_data = get_graph(repo_id)
    nodes = graph_data["nodes"]
    edges = graph_data["edges"]
    
    # We build adjacency for "imports" and "calls" relations
    adj = {n["id"]: [] for n in nodes}
    for e in edges:
        if e["relation_type"] in {"imports", "calls"}:
            s = e["source"]
            t = e["target"]
            if s in adj and t in adj:
                adj[s].append(t)
                
    cycles = []
    visited = {} # id -> status: 0=unvisited, 1=visiting, 2=visited
    
    def dfs(node, path):
        visited[node] = 1 # visiting
        path.append(node)
        
        for neighbor in adj.get(node, []):
            if visited.get(neighbor, 0) == 1:
                # Cycle found! Extract cycle segment from path
                cycle_start_idx = path.index(neighbor)
                cycle_path = path[cycle_start_idx:]
                # Resolve names
                resolved_cycle = []
                for n_id in cycle_path:
                    n_node = next((n for n in nodes if n["id"] == n_id), None)
                    resolved_cycle.append(n_node["name"] if n_node else n_id)
                cycles.append(resolved_cycle)
            elif visited.get(neighbor, 0) == 0:
                dfs(neighbor, path)
                
        path.pop()
        visited[node] = 2 # visited
        
    for n in nodes:
        if visited.get(n["id"], 0) == 0:
            dfs(n["id"], [])
            
    # Remove duplicate cycle shapes (since rotation of same cycle can be found)
    unique_cycles = []
    seen_sets = []
    for c in cycles:
        c_set = set(c)
        if c_set not in seen_sets:
            seen_sets.append(c_set)
            unique_cycles.append(c)
            
    return {
        "status": "success",
        "total_cycles": len(unique_cycles),
        "cycles": unique_cycles
    }

def get_critical_nodes(repo_id: str):
    """
    Identifies high-impact nodes based on degree statistics.
    Heatmap of in-degree (incoming connections) and out-degree.
    """
    graph_data = get_graph(repo_id)
    nodes = graph_data["nodes"]
    edges = graph_data["edges"]
    
    in_degrees = {n["id"]: 0 for n in nodes}
    out_degrees = {n["id"]: 0 for n in nodes}
    
    for edge in edges:
        s = edge["source"]
        t = edge["target"]
        if s in out_degrees:
            out_degrees[s] += 1
        if t in in_degrees:
            in_degrees[t] += 1
            
    sorted_in = []
    sorted_out = []
    
    for n in nodes:
        n_info = {"id": n["id"], "name": n["name"], "type": n["type"]}
        sorted_in.append({**n_info, "count": in_degrees[n["id"]]})
        sorted_out.append({**n_info, "count": out_degrees[n["id"]]})
        
    sorted_in.sort(key=lambda x: x["count"], reverse=True)
    sorted_out.sort(key=lambda x: x["count"], reverse=True)
    
    return {
        "status": "success",
        "critical_incoming": sorted_in[:10], # Top 10 imported/called
        "critical_outgoing": sorted_out[:10]  # Top 10 modules consuming things
    }

def find_path(repo_id: str, start_node_id: str, end_node_id: str):
    """Computes shortest path between two nodes using BFS."""
    graph_data = get_graph(repo_id)
    nodes = graph_data["nodes"]
    edges = graph_data["edges"]
    
    # Resolve names if needed
    start_id = None
    end_id = None
    for n in nodes:
        if n["id"] == start_node_id or n["name"] == start_node_id:
            start_id = n["id"]
        if n["id"] == end_node_id or n["name"] == end_node_id:
            end_id = n["id"]
            
    if not start_id or not end_id:
        return {"status": "error", "message": "Start or end node not found."}
        
    adj, _ = build_adjacency_lists(nodes, edges)
    
    # BFS pathfinding
    queue = deque([[start_id]])
    visited = {start_id}
    
    while queue:
        path = queue.popleft()
        curr = path[-1]
        
        if curr == end_id:
            # Resolve node objects
            resolved_path = []
            for n_id in path:
                n_node = next((n for n in nodes if n["id"] == n_id), None)
                resolved_path.append(n_node if n_node else {"id": n_id, "name": n_id, "type": "unknown"})
            return {"status": "success", "path": resolved_path}
            
        for neighbor, _ in adj.get(curr, []):
            if neighbor not in visited:
                visited.add(neighbor)
                new_path = list(path)
                new_path.append(neighbor)
                queue.append(new_path)
                
    return {"status": "error", "message": "No path exists between target nodes."}
