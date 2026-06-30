import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail ?? error?.message ?? fallbackMessage;
}

export async function cloneRepository(repoUrl) {
  const response = await api.post("/repository/clone", {
    repo_url: repoUrl,
  });

  return response.data;
}

export async function indexRepository(repoPath) {
  const response = await api.post("/indexer/index", {
    repo_path: repoPath,
  });

  return response.data;
}

export async function askQuestion(question) {
  const response = await api.post("/ai/ask", {
    question,
  });

  return response.data;
}

export async function fetchArchitecture(repoPath) {
  const response = await api.post("/repository/architecture", {
    repo_path: repoPath,
  });

  return response.data;
}

export async function fetchCallGraph(repoPath) {
  const response = await api.post("/repository/call-graph", {
    repo_path: repoPath,
  });

  return response.data;
}

export async function fetchFlow(repoPath) {
  const response = await api.post("/repository/flow", {
    repo_path: repoPath,
  });

  return response.data;
}

export default api;
