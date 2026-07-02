import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token into requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("codepilot_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Automatically retry failed transient requests (network drops or 5xx status codes) with exponential backoff
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    if (!config) return Promise.reject(error);

    // Initializing retry state
    config.retryCount = config.retryCount ?? 0;

    // Retry settings
    const MAX_RETRIES = 3;
    const isNetworkOr5xxError =
      !error.response || (error.response.status >= 500 && error.response.status <= 599);

    if (isNetworkOr5xxError && config.retryCount < MAX_RETRIES) {
      config.retryCount += 1;
      
      // Calculate exponential backoff duration (1s, 2s, 4s)
      const backoffDelay = Math.pow(2, config.retryCount) * 1000;
      console.warn(`[API] Retrying request (${config.retryCount}/${MAX_RETRIES}) in ${backoffDelay}ms: ${config.url}`);
      
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return api(config);
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.detail ?? error?.message ?? fallbackMessage;
}

// Authentication Calls
export async function loginDeveloper(name, email) {
  const response = await api.post("/auth/developer-login", { name, email });
  if (response.data?.token) {
    localStorage.setItem("codepilot_token", response.data.token);
  }
  return response.data;
}

export async function fetchUser() {
  const response = await api.get("/auth/me");
  return response.data;
}

// History Calls
export async function fetchRepositories() {
  const response = await api.get("/repositories");
  return response.data;
}

export async function deleteRepository(repoId) {
  const response = await api.delete(`/repositories/${repoId}`);
  return response.data;
}

// Safe File Fetching Call
export async function fetchFileContent(filePath) {
  const response = await api.get("/repository/file", {
    params: { path: filePath },
  });
  return response.data;
}

export async function saveFileContent(filePath, content) {
  const response = await api.post("/repository/save-file", {
    path: filePath,
    content: content,
  });
  return response.data;
}

export async function fetchRepositoryFiles(repoPath) {
  const response = await api.get("/scanner/scan", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

// Existing Core Calls
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

export async function askQuestion(question, repoPath = null) {
  const response = await api.post("/ai/ask", {
    question,
    repo_path: repoPath,
    stream: false,
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

export async function fetchRepositoryReview(repoPath) {
  const response = await api.post("/review/repository", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchRepositoryAnalytics(repoPath) {
  const response = await api.get("/repository/analytics", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

export async function fetchRepositoryGraph(repoPath) {
  const response = await api.get("/repository/graph", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

export async function fetchFileSymbols(filePath) {
  const response = await api.get("/symbols", {
    params: { path: filePath },
  });
  return response.data;
}

export async function searchCodebase(query, repoPath = null) {
  const response = await api.get("/search/search", {
    params: { query, repo_path: repoPath },
  });
  return response.data;
}

export async function runAIActionStream(payload) {
  return fetch(`${API_BASE_URL}/ai/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("codepilot_token") || ""}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchObservabilityMetrics() {
  const response = await api.get("/observability/metrics");
  return response.data;
}

export { API_BASE_URL };
export default api;
