import json
from services.db_service import get_db


def clear_graph(repo_id: str):
    """Deletes all nodes and edges associated with a repository."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM graph_edges WHERE repo_id = ?", (repo_id,))
        cursor.execute("DELETE FROM graph_nodes WHERE repo_id = ?", (repo_id,))
        conn.commit()
    finally:
        conn.close()


def insert_nodes(repo_id: str, nodes: list[dict]):
    """
    Inserts a list of node dicts into graph_nodes.
    Each node dict should contain: id, name, type, path, and optionally meta (dict).
    """
    if not nodes:
        return
    conn = get_db()
    cursor = conn.cursor()
    try:
        data = []
        for node in nodes:
            meta_str = json.dumps(node.get("meta", {}))
            data.append(
                (
                    node["id"],
                    repo_id,
                    node["name"],
                    node["type"],
                    node.get("path", ""),
                    meta_str,
                )
            )
        cursor.executemany(
            """
            INSERT OR REPLACE INTO graph_nodes (id, repo_id, name, type, path, meta)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            data,
        )
        conn.commit()
    finally:
        conn.close()


def insert_edges(repo_id: str, edges: list[dict]):
    """
    Inserts a list of edge dicts into graph_edges.
    Each edge dict should contain: id, source, target, relation_type.
    """
    if not edges:
        return
    conn = get_db()
    cursor = conn.cursor()
    try:
        data = []
        for edge in edges:
            data.append(
                (
                    edge["id"],
                    repo_id,
                    edge["source"],
                    edge["target"],
                    edge["relation_type"],
                )
            )
        cursor.executemany(
            """
            INSERT OR REPLACE INTO graph_edges (id, repo_id, source_node_id, target_node_id, relation_type)
            VALUES (?, ?, ?, ?, ?)
            """,
            data,
        )
        conn.commit()
    finally:
        conn.close()


def get_graph(repo_id: str):
    """Retrieves all nodes and edges for a repository."""
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Fetch nodes
        cursor.execute(
            "SELECT id, name, type, path, meta FROM graph_nodes WHERE repo_id = ?",
            (repo_id,),
        )
        node_rows = cursor.fetchall()
        nodes = []
        for row in node_rows:
            try:
                meta = json.loads(row["meta"]) if row["meta"] else {}
            except Exception:
                meta = {}
            nodes.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "type": row["type"],
                    "path": row["path"],
                    "meta": meta,
                }
            )

        # Fetch edges
        cursor.execute(
            "SELECT id, source_node_id, target_node_id, relation_type FROM graph_edges WHERE repo_id = ?",
            (repo_id,),
        )
        edge_rows = cursor.fetchall()
        edges = []
        for row in edge_rows:
            edges.append(
                {
                    "id": row["id"],
                    "source": row["source_node_id"],
                    "target": row["target_node_id"],
                    "relation_type": row["relation_type"],
                }
            )

        return {"nodes": nodes, "edges": edges}
    finally:
        conn.close()
