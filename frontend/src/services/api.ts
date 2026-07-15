import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

// ─────────────────────────────────────────────────────────────────────────
// Response / entity types (merged into this file — no separate types/ dir)
// ─────────────────────────────────────────────────────────────────────────

// ─── Auth ──────────────────────────────────────────────────────────────────
// CONFIDENT: token/refresh_token fields are read directly in services/api.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  mfa_enabled?: boolean;
}

export interface AuthTokenResponse {
  token: string;
  refresh_token?: string;
  user?: User;
  /** present on the temp-token step of an MFA-gated login */
  mfa_required?: boolean;
  temp_token?: string;
}

export interface MfaSetupResponse {
  secret: string;
  qr_code_url: string;
}

// ─── Repositories ──────────────────────────────────────────────────────────
// CONFIDENT (revised): field names confirmed against actual usage in useRepository.ts
// (repo.repository_path, repo.repository_name, repo.files_indexed, repo.chunks_indexed).
// id kept as `string | number` since it's compared against deleteRepository's
// `repoId: string | number` param — confirm the real DB type (SQLite PK is
// typically numeric) and narrow this if you know it's always one or the other.
export interface Repository {
  id: string | number;
  repository_name: string;
  repository_path: string;
  files_indexed: number;
  chunks_indexed: number;
  created_at?: string;
  status?: "indexed" | "indexing" | "error" | "pending";
}

// CONFIDENT (revised): useRepository.ts reads `cloneRes.path`, not `repo_path`.
export interface CloneRepositoryResponse {
  path: string;
  name?: string;
}

export interface IndexRepositoryResponse {
  status: string;
  files_indexed?: number;
}

// CONFIDENT: shape confirmed against WS message handling in useRepository.ts.
// `stage` carries free-text progress labels ("Repository validation", etc.)
// plus the two terminal values checked in code ("Completed" | "Failed") — kept
// as `string` rather than a union since intermediate stage names aren't
// enumerable from the frontend alone. `data` is only populated on completion.
export interface IndexingProgressData {
  progress: number;
  stage: string;
  message: string;
  data?: {
    files_indexed: number;
    chunks_indexed: number;
  };
}

// ─── Files & symbols ───────────────────────────────────────────────────────
// CONFIDENT: `.content` is read directly in useWorkspace.ts
export interface FileContentResponse {
  content: string;
  language?: string;
  size?: number;
}

export interface SaveFileResponse {
  status: string;
  saved_at?: string;
}

// CONFIDENT: matches SymbolItem already used in useWorkspace.ts
export interface SymbolItem {
  name: string;
  line: number;
  column?: number;
  kind?: string;
}

// INFERRED — scanner file-tree shape
export interface RepositoryFileNode {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: RepositoryFileNode[];
}

// ─── AI / search ───────────────────────────────────────────────────────────
// INFERRED
export interface AskQuestionResponse {
  answer: string;
  sources?: Array<{ file: string; line?: number }>;
}

export interface SearchResultItem {
  file: string;
  line: number;
  snippet: string;
  score?: number;
}

export type SearchCodebaseResponse = SearchResultItem[];

export interface AIActionPayload {
  action: string;
  file_path?: string;
  selection?: string;
  prompt?: string;
  repo_path?: string | null;
  [key: string]: unknown; // action payload varies by action type — see note below
}

// ─── Architecture / graph / review / analytics ────────────────────────────
// INFERRED — these are the loosest guesses in this file; confirm against backend
export interface ArchitectureResponse {
  analysis?: string;
  modules?: Array<{ name: string; path: string; dependencies?: string[] }>;
}

export interface CallGraphResponse {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ source: string; target: string }>;
}

export interface FlowResponse {
  nodes: Array<{ id: string; label: string; type?: string }>;
  edges: Array<{ source: string; target: string; label?: string }>;
}

export interface RepositoryReview {
  summary: string;
  issues: Array<{ severity: "low" | "medium" | "high" | "critical"; message: string; file?: string; line?: number }>;
}

export interface RepositoryAnalytics {
  total_files: number;
  total_lines: number;
  languages: Record<string, number>;
}

export interface RepositoryGraphResponse {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ source: string; target: string }>;
}

export interface TokenUsageEntry {
  date: string;
  tokens_used: number;
  cost?: number;
}

export interface CodebaseAnalytics {
  total_files: number;
  total_lines: number;
  languages: Record<string, number>;
}

export interface WorkspaceActivityEntry {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user?: string;
}

export interface ObservabilityMetrics {
  uptime_seconds: number;
  requests_total: number;
  error_rate: number;
}

// ─── API keys ──────────────────────────────────────────────────────────────
// INFERRED
export interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  expires_at?: string;
  /** only returned once, at creation time */
  key?: string;
}

// ─── Admin / RBAC ──────────────────────────────────────────────────────────
// INFERRED
export interface ProjectMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target?: string;
  timestamp: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
}

// ─── Compliance ────────────────────────────────────────────────────────────
// CONFIDENT: matches the existing updateComplianceSettings payload
export interface ComplianceSettings {
  hipaa_mode: boolean;
  sox_mode: boolean;
  retention_days: number;
  session_timeout: boolean;
  slack_enabled: boolean;
  jira_enabled: boolean;
  github_ent_enabled: boolean;
}

// ─── Notifications ─────────────────────────────────────────────────────────
// INFERRED
export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
  type?: string;
}

// ─── Reports ───────────────────────────────────────────────────────────────
// INFERRED
export interface ReportGenerationResponse {
  report_id: string;
  status: "queued" | "processing" | "complete" | "failed";
}

export interface ReportHistoryEntry {
  id: string;
  repository_id: string;
  report_type: "pdf" | "markdown";
  created_at: string;
  status: string;
}

// ─── Error shape ───────────────────────────────────────────────────────────
// CONFIDENT: matches existing getErrorMessage() usage (error.response.data.detail)
export interface ApiErrorPayload {
  detail?: string;
  message?: string;
}

const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Extend axios's config type with the custom fields this module attaches,
// instead of casting to `any` at every call site.
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    retryCount?: number;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token into requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("codepilot_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

interface QueuedRequest {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
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
  async (error: AxiosError<ApiErrorPayload>) => {
    const { config, response } = error;
    if (!config) return Promise.reject(error);

    // 1. Handle token refresh on 401 Unauthorized
    if (response && response.status === 401 && !config._retry) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            return api(config);
          })
          .catch((err: unknown) => Promise.reject(err));
      }

      config._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("codepilot_refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post<AuthTokenResponse>(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { token, refresh_token: newRefreshToken } = res.data;

          localStorage.setItem("codepilot_token", token);
          if (newRefreshToken) {
            localStorage.setItem("codepilot_refresh_token", newRefreshToken);
          }

          config.headers.Authorization = `Bearer ${token}`;
          processQueue(null, token);
          isRefreshing = false;
          return api(config);
        } catch (refreshError: unknown) {
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
    config.retryCount = config.retryCount ?? 0;
    const MAX_RETRIES = 3;
    const isNetworkOr5xxError =
      !error.response || (error.response.status >= 500 && error.response.status <= 599);

    if (isNetworkOr5xxError && config.retryCount < MAX_RETRIES) {
      config.retryCount += 1;

      const backoffDelay = Math.pow(2, config.retryCount) * 1000;
      console.warn(
        `[API] Retrying request (${config.retryCount}/${MAX_RETRIES}) in ${backoffDelay}ms: ${config.url}`
      );

      // Dispatch custom event for UI tracking
      window.dispatchEvent(
        new CustomEvent("api_request_retry", {
          detail: {
            url: config.url,
            attempt: config.retryCount,
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

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.detail ?? error.message ?? fallbackMessage;
  }
  if (error instanceof Error) return error.message;
  return fallbackMessage;
}

// ─── Authentication Calls ───────────────────────────────────────────────────
export async function loginDeveloper(name: string, email: string): Promise<AuthTokenResponse> {
  const response = await api.post<AuthTokenResponse>("/auth/developer-login", { name, email });
  if (response.data?.token) {
    localStorage.setItem("codepilot_token", response.data.token);
  }
  return response.data;
}

export async function fetchUser(): Promise<User> {
  const response = await api.get<User>("/auth/me");
  return response.data;
}

// ─── Repository Calls ───────────────────────────────────────────────────────
export async function fetchRepositories(): Promise<Repository[]> {
  const response = await api.get<Repository[]>("/repositories");
  return response.data;
}

export async function deleteRepository(repoId: string | number): Promise<{ status: string }> {
  const response = await api.delete<{ status: string }>(`/repositories/${repoId}`);
  return response.data;
}

// Safe File Fetching Call
export async function fetchFileContent(filePath: string): Promise<FileContentResponse> {
  const response = await api.get<FileContentResponse>("/repository/file", {
    params: { path: filePath },
  });
  return response.data;
}

export async function saveFileContent(filePath: string, content: string): Promise<SaveFileResponse> {
  const response = await api.post<SaveFileResponse>("/repository/save-file", {
    path: filePath,
    content: content,
  });
  return response.data;
}

export async function fetchRepositoryFiles(repoPath: string): Promise<RepositoryFileNode[]> {
  const response = await api.get<RepositoryFileNode[]>("/scanner/scan", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

// ─── Existing Core Calls ────────────────────────────────────────────────────
export async function cloneRepository(
  repoUrl: string,
  accessToken?: string
): Promise<CloneRepositoryResponse> {
  const response = await api.post<CloneRepositoryResponse>("/repository/clone", {
    repo_url: repoUrl,
    access_token: accessToken || null,
  });
  return response.data;
}

export async function indexRepository(repoPath: string): Promise<IndexRepositoryResponse> {
  const response = await api.post<IndexRepositoryResponse>("/indexer/index", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function askQuestion(
  question: string,
  repoPath: string | null = null
): Promise<AskQuestionResponse> {
  const response = await api.post<AskQuestionResponse>("/ai/ask", {
    question,
    repo_path: repoPath,
    stream: false,
  });
  return response.data;
}

export async function fetchArchitecture(repoPath: string): Promise<ArchitectureResponse> {
  const response = await api.post<ArchitectureResponse>("/repository/architecture", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchCallGraph(repoPath: string): Promise<CallGraphResponse> {
  const response = await api.post<CallGraphResponse>("/repository/call-graph", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchFlow(repoPath: string): Promise<FlowResponse> {
  const response = await api.post<FlowResponse>("/repository/flow", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchRepositoryReview(repoPath: string): Promise<RepositoryReview> {
  const response = await api.post<RepositoryReview>("/review/repository", {
    repo_path: repoPath,
  });
  return response.data;
}

export async function fetchRepositoryAnalytics(repoPath: string): Promise<RepositoryAnalytics> {
  const response = await api.get<RepositoryAnalytics>("/repository/analytics", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

export async function fetchRepositoryGraph(repoPath: string): Promise<RepositoryGraphResponse> {
  const response = await api.get<RepositoryGraphResponse>("/repository/graph", {
    params: { repo_path: repoPath },
  });
  return response.data;
}

export async function fetchFileSymbols(filePath: string): Promise<SymbolItem[]> {
  const response = await api.get<SymbolItem[]>("/symbols", {
    params: { path: filePath },
  });
  return response.data;
}

export async function searchCodebase(
  query: string,
  repoPath: string | null = null
): Promise<SearchCodebaseResponse> {
  const response = await api.get<SearchCodebaseResponse>("/search/search", {
    params: { query, repo_path: repoPath },
  });
  return response.data;
}

// NOTE: payload shape varies per action type (kept as a broad record in
// AIActionPayload — see types/api.ts). If you have a fixed set of action
// kinds, a discriminated union keyed on `action` would be stricter; happy
// to build that once I see the action variants.
export async function runAIActionStream(
  payload: Record<string, unknown>
): Promise<Response> {
  return fetch(`${API_BASE_URL}/ai/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("codepilot_token") || ""}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchObservabilityMetrics(): Promise<ObservabilityMetrics> {
  const response = await api.get<ObservabilityMetrics>("/observability/metrics");
  return response.data;
}

export async function createApiKey(name: string, expiresInDays: number = 30): Promise<ApiKey> {
  const response = await api.post<ApiKey>("/auth/api-keys", { name, expires_in_days: expiresInDays });
  return response.data;
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const response = await api.get<ApiKey[]>("/auth/api-keys");
  return response.data;
}

export async function revokeApiKey(keyId: string): Promise<{ status: string }> {
  const response = await api.delete<{ status: string }>(`/auth/api-keys/${keyId}`);
  return response.data;
}

export async function fetchProjectMembers(repositoryId: string): Promise<ProjectMember[]> {
  const response = await api.get<ProjectMember[]>("/admin/members", {
    params: { repository_id: repositoryId },
  });
  return response.data;
}

export async function updateMemberRole(
  repositoryId: string,
  projectId: string,
  userId: string,
  role: string
): Promise<{ status: string }> {
  const response = await api.put<{ status: string }>("/admin/members/role", {
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
): Promise<AuditLogResponse> {
  const response = await api.get<AuditLogResponse>("/admin/audit-logs", {
    params: {
      repository_id: repositoryId,
      limit: limit,
      offset: offset,
      ...(search ? { search: search } : {}),
    },
  });
  return response.data;
}

export async function mfaSetup(): Promise<MfaSetupResponse> {
  const response = await api.post<MfaSetupResponse>("/auth/mfa/setup");
  return response.data;
}

export async function mfaConfirm(code: string): Promise<{ status: string }> {
  const response = await api.post<{ status: string }>("/auth/mfa/confirm", { code });
  return response.data;
}

export async function mfaDisable(code: string): Promise<{ status: string }> {
  const response = await api.post<{ status: string }>("/auth/mfa/disable", { code });
  return response.data;
}

export async function loginMfaVerify(tempToken: string, code: string): Promise<AuthTokenResponse> {
  const response = await api.post<AuthTokenResponse>("/auth/login/mfa-verify", {
    temp_token: tempToken,
    code: code,
  });
  return response.data;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const response = await api.get<NotificationItem[]>("/notifications");
  return response.data;
}

export async function markNotificationRead(notificationId: string): Promise<{ status: string }> {
  const response = await api.put<{ status: string }>(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsRead(): Promise<{ status: string }> {
  const response = await api.post<{ status: string }>("/notifications/read-all");
  return response.data;
}

export async function fetchComplianceSettings(): Promise<ComplianceSettings> {
  const response = await api.get<ComplianceSettings>("/compliance/settings");
  return response.data;
}

export async function updateComplianceSettings(
  payload: ComplianceSettings
): Promise<ComplianceSettings> {
  const response = await api.put<ComplianceSettings>("/compliance/settings", payload);
  return response.data;
}

export async function fetchTokenUsage(): Promise<TokenUsageEntry[]> {
  const response = await api.get<TokenUsageEntry[]>("/analytics/tokens");
  return response.data;
}

export async function fetchCodebaseAnalytics(): Promise<CodebaseAnalytics> {
  const response = await api.get<CodebaseAnalytics>("/analytics/codebase");
  return response.data;
}

export async function fetchWorkspaceActivity(): Promise<WorkspaceActivityEntry[]> {
  const response = await api.get<WorkspaceActivityEntry[]>("/analytics/activity");
  return response.data;
}

export { API_BASE_URL };

// ─── Reports API ─────────────────────────────────────────────────────────────

export async function generateReport(
  repositoryId: string,
  reportType: "pdf" | "markdown"
): Promise<ReportGenerationResponse> {
  const response = await api.post<ReportGenerationResponse>("/reports/generate", {
    repository_id: repositoryId,
    report_type: reportType,
  });
  return response.data;
}

export async function fetchReportHistory(repositoryId: string): Promise<ReportHistoryEntry[]> {
  const response = await api.get<ReportHistoryEntry[]>("/reports/history", {
    params: { repository_id: repositoryId },
  });
  return response.data;
}

export function getReportDownloadUrl(reportId: string): string {
  const token = localStorage.getItem("codepilot_token") || "";
  return `${API_BASE_URL}/reports/${reportId}/download?token=${token}`;
}

export default api;