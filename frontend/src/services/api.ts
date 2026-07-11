import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("codepilot_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Automatically retry failed transient requests (network drops or 5xx status codes) with exponential backoff
// and handle silent token rotation on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!config) return Promise.reject(error);

    // 1. Handle token refresh on 401 Unauthorized
    if (response && response.status === 401 && !config._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            return api(config);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      config._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("codepilot_refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { token, refresh_token: newRefreshToken } = res.data;
          
          localStorage.setItem("codepilot_token", token);
          localStorage.setItem("codepilot_refresh_token", newRefreshToken);
          
          config.headers.Authorization = `Bearer ${token}`;
          processQueue(null, token);
          isRefreshing = false;
          return api(config);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          localStorage.removeItem("codepilot_token");
          localStorage.removeItem("codepilot_refresh_token");
          window.dispatchEvent(new Event("codepilot_unauthorized"));
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem("codepilot_token");
        window.dispatchEvent(new Event("codepilot_unauthorized"));
      }
    }

    // 2. Handle transient network/5xx retries
    (config as any).retryCount = (config as any).retryCount ?? 0;
    const MAX_RETRIES = 3;
    const isNetworkOr5xxError =
      !error.response || (error.response.status >= 500 && error.response.status <= 599);

    if (isNetworkOr5xxError && (config as any).retryCount < MAX_RETRIES) {
      (config as any).retryCount += 1;
      
      const backoffDelay = Math.pow(2, (config as any).retryCount) * 1000;
      console.warn(`[API] Retrying request (${(config as any).retryCount}/${MAX_RETRIES}) in ${backoffDelay}ms: ${config.url}`);
      
      // Dispatch custom event for UI tracking
      window.dispatchEvent(
        new CustomEvent("api_request_retry", {
          detail: {
            url: config.url,
            attempt: (config as any).retryCount,
            maxAttempts: MAX_RETRIES,
            delay: backoffDelay,
          },
        })
      );
      
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return api(config);
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: any, fallbackMessage: string): string {
  return error?.response?.data?.detail ?? error?.message ?? fallbackMessage;
}

// Authentication Calls
export async function loginDeveloper(name: string, email: string): Promise<any> {
  const response = await api.post("/auth/developer-login", { name, email });
  if (response.data?.token) {
    localStorage.setItem("codepilot_token", response.data.token);
  }
  return response.data;
}

export async function fetchUser(): Promise<any> {
  const response = await api.get("/auth/me");
  return response.data;
}

// History Calls
export async function fetchRepositories(): Promise<any> {
  const response = await api.get("/repositories");
  return response.data;
}

export async function deleteRepository(repoId: string | number): Promise<any> {
  const response = await api.delete(`/repositories/${repoId}`);
  return response.data;
}

// Safe File Fetching Call
export async function fetchFileContent(filePath: string): Promise<any> {
  const response = await api.get("/repository/file", {
    params: { path: filePath },
  });
  return response.data;
}

export async function saveFileContent(filePath: string, content: string): Promise<any> {
  const response = await api.post("/repository/save-file", {
    path: filePath,
    content: content,
  });
  return response.data;
}

export async function fetchRepositoryFiles(repoPath: string): Promise<any> {
  const response = await api.get("/scanner/scan", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

// Existing Core Calls
export async function cloneRepository(repoUrl: string, accessToken?: string): Promise<any> {
  const response = await api.post("/repository/clone", {
    repo_url: repoUrl,
    access_token: accessToken || null,
  });
  return response.data;
}

export async function indexRepository(repoPath: string): Promise<any> {
  const response = await api.post("/indexer/index", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function askQuestion(question: string, repoPath: string | null = null): Promise<any> {
  const response = await api.post("/ai/ask", {
    question,
    repo_path: repoPath,
    stream: false,
  });
  return response.data;
}

export async function fetchArchitecture(repoPath: string): Promise<any> {
  const response = await api.post("/repository/architecture", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchCallGraph(repoPath: string): Promise<any> {
  const response = await api.post("/repository/call-graph", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchFlow(repoPath: string): Promise<any> {
  const response = await api.post("/repository/flow", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchRepositoryReview(repoPath: string): Promise<any> {
  const response = await api.post("/review/repository", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchRepositoryAnalytics(repoPath: string): Promise<any> {
  const response = await api.get("/repository/analytics", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

export async function fetchRepositoryGraph(repoPath: string): Promise<any> {
  const response = await api.get("/repository/graph", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

export async function fetchFileSymbols(filePath: string): Promise<any> {
  const response = await api.get("/symbols", {
    params: { path: filePath },
  });
  return response.data;
}

export async function searchCodebase(query: string, repoPath: string | null = null): Promise<any> {
  const response = await api.get("/search/search", {
    params: { query, repo_path: repoPath },
  });
  return response.data;
}

export async function runAIActionStream(payload: any): Promise<any> {
  return fetch(`${API_BASE_URL}/ai/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("codepilot_token") || ""}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchObservabilityMetrics(): Promise<any> {
  const response = await api.get("/observability/metrics");
  return response.data;
}

export async function createApiKey(name: string, expiresInDays: number = 30): Promise<any> {
  const response = await api.post("/auth/api-keys", { name, expires_in_days: expiresInDays });
  return response.data;
}

export async function fetchApiKeys(): Promise<any> {
  const response = await api.get("/auth/api-keys");
  return response.data;
}

export async function revokeApiKey(keyId: string): Promise<any> {
  const response = await api.delete(`/auth/api-keys/${keyId}`);
  return response.data;
}

export async function fetchProjectMembers(repositoryId: string): Promise<any> {
  const response = await api.get("/admin/members", {
    params: { repository_id: repositoryId },
  });
  return response.data;
}

export async function updateMemberRole(
  repositoryId: string,
  projectId: string,
  userId: string,
  role: string
): Promise<any> {
  const response = await api.put("/admin/members/role", {
    repository_id: repositoryId,
    project_id: projectId,
    user_id: userId,
    role: role,
  });
  return response.data;
}

export async function fetchAuditLogs(
  repositoryId: string,
  limit: number = 50,
  offset: number = 0,
  search?: string
): Promise<any> {
  const response = await api.get("/admin/audit-logs", {
    params: {
      repository_id: repositoryId,
      limit: limit,
      offset: offset,
      ...(search ? { search: search } : {}),
    },
  });
  return response.data;
}

export async function mfaSetup(): Promise<any> {
  const response = await api.post("/auth/mfa/setup");
  return response.data;
}

export async function mfaConfirm(code: string): Promise<any> {
  const response = await api.post("/auth/mfa/confirm", { code });
  return response.data;
}

export async function mfaDisable(code: string): Promise<any> {
  const response = await api.post("/auth/mfa/disable", { code });
  return response.data;
}

export async function loginMfaVerify(tempToken: string, code: string): Promise<any> {
  const response = await api.post("/auth/login/mfa-verify", {
    temp_token: tempToken,
    code: code,
  });
  return response.data;
}

export async function fetchNotifications(): Promise<any> {
  const response = await api.get("/notifications");
  return response.data;
}

export async function markNotificationRead(notificationId: string): Promise<any> {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsRead(): Promise<any> {
  const response = await api.post("/notifications/read-all");
  return response.data;
}

export async function fetchComplianceSettings(): Promise<any> {
  const response = await api.get("/compliance/settings");
  return response.data;
}

export async function updateComplianceSettings(payload: {
  hipaa_mode: boolean;
  sox_mode: boolean;
  retention_days: number;
  session_timeout: boolean;
  slack_enabled: boolean;
  jira_enabled: boolean;
  github_ent_enabled: boolean;
}): Promise<any> {
  const response = await api.put("/compliance/settings", payload);
  return response.data;
}

export async function fetchTokenUsage(): Promise<any[]> {
  const response = await api.get("/analytics/tokens");
  return response.data;
}

export async function fetchCodebaseAnalytics(): Promise<any> {
  const response = await api.get("/analytics/codebase");
  return response.data;
}

export async function fetchWorkspaceActivity(): Promise<any[]> {
  const response = await api.get("/analytics/activity");
  return response.data;
}

export { API_BASE_URL };

// ─── Reports API ─────────────────────────────────────────────────────────────

export async function generateReport(
  repositoryId: string,
  reportType: "pdf" | "markdown"
): Promise<any> {
  const response = await api.post("/reports/generate", {
    repository_id: repositoryId,
    report_type: reportType,
  });
  return response.data;
}

export async function fetchReportHistory(repositoryId: string): Promise<any[]> {
  const response = await api.get("/reports/history", {
    params: { repository_id: repositoryId },
  });
  return response.data;
}

export function getReportDownloadUrl(reportId: string): string {
  const token = localStorage.getItem("codepilot_token") || "";
  return `${API_BASE_URL}/reports/${reportId}/download?token=${token}`;
}

export default api;





