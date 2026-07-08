import api from "./api";

export async function fetchKnowledgeGraph(repoId: string): Promise<any> {
  const response = await api.get(`/knowledge/graph?repo_id=${encodeURIComponent(repoId)}`);
  return response.data;
}

export async function queryKnowledgeGraph(
  repoId: string,
  queryType: string,
  node: string,
  targetNode: string | null = null
): Promise<any> {
  let url = `/knowledge/query?repo_id=${encodeURIComponent(repoId)}&query_type=${queryType}&node=${encodeURIComponent(node)}`;
  if (targetNode) {
    url += `&target_node=${encodeURIComponent(targetNode)}`;
  }
  const response = await api.get(url);
  return response.data;
}

export async function fetchCriticalMetrics(repoId: string): Promise<any> {
  const response = await api.get(`/knowledge/critical?repo_id=${encodeURIComponent(repoId)}`);
  return response.data;
}
