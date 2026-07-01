import api from "./api";

export async function fetchKnowledgeGraph(repoId) {
  const response = await api.get(`/knowledge/graph?repo_id=${encodeURIComponent(repoId)}`);
  return response.data;
}

export async function queryKnowledgeGraph(repoId, queryType, node, targetNode = null) {
  let url = `/knowledge/query?repo_id=${encodeURIComponent(repoId)}&query_type=${queryType}&node=${encodeURIComponent(node)}`;
  if (targetNode) {
    url += `&target_node=${encodeURIComponent(targetNode)}`;
  }
  const response = await api.get(url);
  return response.data;
}

export async function fetchCriticalMetrics(repoId) {
  const response = await api.get(`/knowledge/critical?repo_id=${encodeURIComponent(repoId)}`);
  return response.data;
}
