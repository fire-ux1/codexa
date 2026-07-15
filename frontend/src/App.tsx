import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  fetchUser,
  fetchRepositories,
  loginDeveloper,
} from "./services/api";

import ToastContainer from "./components/common/ToastContainer";
import LoginScreen from "./components/auth/LoginScreen";
import Sidebar from "./components/sidebar/Sidebar";
import OnboardingPanel from "./components/workspace/OnboardingPanel";
import AIWorkspace from "./components/workspace/AIWorkspace";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import MfaVerificationModal from "./components/common/MfaVerificationModal";

// Hooks
import useToast from "./hooks/useToast";
import useRepository from "./hooks/useRepository";
import useArchitecture from "./hooks/useArchitecture";
import useCallGraph from "./hooks/useCallGraph";
import useExecutionFlow from "./hooks/useExecutionFlow";

// Utilities
import { statusTones } from "./utils/constants";
import { getFileColor } from "./utils/colors";

interface User {
  id: string;
  name: string;
  email: string;
  mfa_enabled?: boolean;
}

interface RepoHistoryEntry {
  id: string | number;
  repository_path: string;
  repository_name?: string;
  status: "completed" | "cloning" | "indexing" | "error" | string;
  [key: string]: unknown;
}

const TOKEN_KEY = "codepilot_token";
const REFRESH_TOKEN_KEY = "codepilot_refresh_token";

function persistTokens(token: string, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

function clearPersistedTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Generates a unique-per-tab sandbox identity so concurrent sandbox users
 *  don't collide on the same name/email at the backend. */
function generateSandboxIdentity() {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return {
    name: `Sandbox Developer ${id}`,
    email: `sandbox+${id}@codepilot.ai`,
  };
}

// Reads and strips ALL recognized auth-related query params in one place,
// so we never risk one code path stripping a param another path still needs.
function consumeAuthParamsFromUrl(): {
  token: string | null;
  refreshToken: string | null;
  mfaRequired: boolean;
  mfaTempToken: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const result = {
    token: params.get("token"),
    refreshToken: params.get("refresh_token"),
    mfaRequired: params.get("mfa_required") === "true",
    mfaTempToken: params.get("mfa_temp_token"),
  };

  if (result.token || result.mfaTempToken) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  return result;
}

const getInitialToken = (): string => {
  const { token, refreshToken } = consumeAuthParamsFromUrl();
  if (token) {
    persistTokens(token, refreshToken ?? undefined);
    return token;
  }
  return localStorage.getItem(TOKEN_KEY) || "";
};

export default function App() {
  // Authentication & History States
  const [token, setToken] = useState<string>(getInitialToken);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<RepoHistoryEntry[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [showSandboxForm, setShowSandboxForm] = useState<boolean>(false);
  const [sandboxIdentity] = useState(generateSandboxIdentity);
  const [sandboxName, setSandboxName] = useState<string>(sandboxIdentity.name);
  const [sandboxEmail, setSandboxEmail] = useState<string>(sandboxIdentity.email);
  const [mfaTempToken, setMfaTempToken] = useState<string>("");
  const [showMfaModal, setShowMfaModal] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState<boolean>(false);

  // Hooks Integration
  const { toasts, showToast } = useToast() as any;

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Internet connection restored. Reconnecting...", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("Internet connection lost. You are currently offline.", "error");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast]);

  const {
    repoUrl,
    setRepoUrl,
    accessToken,
    setAccessToken,
    repoPath,
    isCloning,
    indexingProgress,
    status,
    setStatus,
    clearWorkspace,
    selectRepositoryFromHistory,
    handleDeleteRepository,
    handleIndexRepository,
  } = useRepository(token, showToast, history as any, setHistory as any) as any;

  const {
    architecture,
    setArchitecture,
    graphNodes,
    graphEdges,
    selectedNode,
    setSelectedNode,
    isArchitectureLoading,
    isGraphLoadingReactFlow,
    handleGetArchitecture,
    handleNodeClick,
    error: architectureError,
  } = useArchitecture(repoPath, setStatus, getFileColor) as any;

  const {
    callGraph,
    setCallGraph,
    isGraphLoading,
    graphSearch,
    setGraphSearch,
    selectedFunc,
    setSelectedFunc,
    handleGetCallGraph,
    error: callGraphError,
  } = useCallGraph(repoPath, setStatus) as any;

  const { setFlowData } = useExecutionFlow(repoPath, setStatus) as any;

  // Sign out helper
  const handleSignOut = useCallback(() => {
    clearPersistedTokens();
    setToken("");
    setUser(null);
    setHistory([]);
    clearWorkspace();
    setArchitecture("");
    setCallGraph(null);
    setFlowData(null);
    setSelectedFunc(null);
    setSelectedNode(null);
    showToast("Signed out.", "info");
  }, [
    clearWorkspace,
    showToast,
    setArchitecture,
    setCallGraph,
    setFlowData,
    setSelectedFunc,
    setSelectedNode,
  ]);

  // One-time mount effect: reads OAuth params from URL, loads user profile.
  // IMPORTANT: `token` is intentionally NOT in the dependency array.
  // Adding it would cause a re-run every time the sandbox login updates the token
  // state, leading to an infinite fetch loop. User loads happen once on mount
  // and then again only when the user explicitly logs in via handleSandboxLogin.
  useEffect(() => {
    const handleUnauthorized = () => {
      handleSignOut();
      showToast("Session expired. Please log in again.", "error");
    };

    window.addEventListener("codepilot_unauthorized", handleUnauthorized);

    // Note: token/refresh_token params (if present) were already consumed and
    // stripped by getInitialToken()'s lazy initializer, which runs before this
    // effect on first render. Only mfa_* params can still be present here,
    // since a token response and an mfa_required response are mutually
    // exclusive from the backend.
    const { mfaRequired, mfaTempToken: mfaTemp } = consumeAuthParamsFromUrl();

    if (mfaRequired && mfaTemp) {
      setMfaTempToken(mfaTemp);
      setShowMfaModal(true);
      setIsAuthLoading(false);
      return () => {
        window.removeEventListener("codepilot_unauthorized", handleUnauthorized);
      };
    }

    const loadUserAndHistory = async () => {
      const activeToken = localStorage.getItem(TOKEN_KEY);
      if (activeToken) {
        try {
          const profile = await fetchUser();
          if (!mountedRef.current) return;
          setUser(profile);

          const historyList = (await fetchRepositories()) as unknown as RepoHistoryEntry[];
          if (!mountedRef.current) return;
          setHistory(historyList);

          // If there's a recent completed repository, auto-select it
          if (historyList.length > 0) {
            const latest =
              historyList.find((r) => r.status === "completed") || historyList[0];
            if (latest.status === "completed") {
              selectRepositoryFromHistory(latest);
            }
          }
        } catch (error: any) {
          console.error("Auth Load Error:", error);
          if (!mountedRef.current) return;
          // Only clear session on explicit 401 — not on network errors,
          // to avoid a loop where a transient error wipes valid credentials.
          const statusCode = error?.response?.status;
          if (statusCode === 401 || statusCode === 403) {
            clearPersistedTokens();
            setToken("");
            setUser(null);
          }
          // For network errors / 5xx, just let the user stay on the loading
          // screen briefly; the retry interceptor will handle retries.
        }
      }
      if (mountedRef.current) setIsAuthLoading(false);
    };

    loadUserAndHistory();
    return () => {
      window.removeEventListener("codepilot_unauthorized", handleUnauthorized);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const activeRepo = history.find((r) => r.repository_path === repoPath);
  const activeRepoId = activeRepo ? activeRepo.id : null;
  const repositoryReady = Boolean(repoPath);

  // Sandbox login helper
  const handleSandboxLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmittingLogin(true);
    try {
      setIsAuthLoading(true);
      const res = await loginDeveloper(sandboxName, sandboxEmail);
      if (res.mfa_required) {
        setMfaTempToken(res.temp_token ?? "");
        setShowMfaModal(true);
        setIsAuthLoading(false); // reset before early return
        return;
      }
      // Persist immediately — without this, the session is lost on refresh
      // even though React state looks logged in.
      persistTokens(res.token, res.refresh_token);
      setToken(res.token);
      setUser(res.user ?? null);
      setShowSandboxForm(false);
      showToast(`Logged in as Sandbox Session: ${res.user?.name ?? ""}`, "success");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Developer login failed. Please try again.";
      setLoginError(msg);
      showToast("Developer login failed.", "error");
    } finally {
      setIsSubmittingLogin(false);
      setIsAuthLoading(false);
    }
  };

  // Handle repository selection override
  const handleSelectRepository = (repo: RepoHistoryEntry) => {
    selectRepositoryFromHistory(repo);
    setArchitecture("");
    setCallGraph(null);
    setFlowData(null);
    setSelectedFunc(null);
    setSelectedNode(null);
  };



  const filteredFunctions = useMemo(() => {
    if (!callGraph) return [];
    const keys = Object.keys(callGraph);
    if (!graphSearch.trim()) return keys;
    return keys.filter((key) => key.toLowerCase().includes(graphSearch.toLowerCase()));
  }, [callGraph, graphSearch]);

  const functionCallers = useMemo(() => {
    if (!callGraph || !selectedFunc) return [];
    const callers: string[] = [];
    Object.entries(callGraph).forEach(([funcName, callees]) => {
      if ((callees as string[]).includes(selectedFunc) && funcName !== selectedFunc) {
        callers.push(funcName);
      }
    });
    return callers;
  }, [callGraph, selectedFunc]);

  // If initial auth is running
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin inline-block"></span>
          <p className="text-gray-400 font-medium text-sm">Authenticating ChunkWiser Session...</p>
        </div>
      </div>
    );
  }

  // 1. ONBOARDING SIGN IN SCREEN
  if (!user) {
    return (
      <LoginScreen
        showSandboxForm={showSandboxForm}
        sandboxName={sandboxName}
        sandboxEmail={sandboxEmail}
        onSandboxNameChange={setSandboxName}
        onSandboxEmailChange={setSandboxEmail}
        onToggleSandboxForm={setShowSandboxForm}
        onSandboxLogin={handleSandboxLogin}
        isSubmitting={isSubmittingLogin}
        errorMessage={loginError}
      />
    );
  }

  // 2. MAIN APPLICATION WORKSPACE
  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden">
      {/* Toast Alert Notification system */}
      <ToastContainer toasts={toasts} />

      {!isOnline && (
        <div className="bg-rose-600 text-white py-2 px-4 text-center text-xs font-mono font-bold tracking-wider z-[9999] animate-pulse shrink-0 flex items-center justify-center gap-2">
          <span>⚠️ Connection Lost: You are currently offline. Retrying requests when connectivity is restored...</span>
        </div>
      )}

      <ErrorBoundary>
        {!repositoryReady ? (
          /* ONBOARDING STATE */
          <div className="flex flex-col md:flex-row flex-1 min-h-screen">
            <Sidebar
              user={user}
              history={history.map((r) => ({
              ...r,
              id: r.id ?? "",
              repository_path: r.repository_path ?? "",
              repository_name: (r.repository_name as string) ?? r.repository_path?.split(/[/\\]/).pop() ?? "Unknown",
              status: (r.status as "completed" | "indexing" | "failed") || "completed",
            }))}
              repoPath={repoPath}
              onSignOut={handleSignOut}
              onClearWorkspace={clearWorkspace}
              onSelectRepo={handleSelectRepository}
              onDeleteRepo={handleDeleteRepository}
            />
            <div className="flex-grow p-4 md:p-6 lg:p-8">
              {/* Status Bar */}
              <div
                className={`mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border ${
                  (statusTones as Record<string, string>)[status.tone]
                } transition-all duration-300 glass overflow-hidden`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="flex h-2.5 w-2.5 relative shrink-0">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        status.tone === "loading"
                          ? "bg-indigo-400"
                          : status.tone === "success"
                          ? "bg-emerald-400"
                          : status.tone === "error"
                          ? "bg-rose-400"
                          : "bg-gray-400"
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        status.tone === "loading"
                          ? "bg-indigo-500"
                          : status.tone === "success"
                          ? "bg-emerald-500"
                          : status.tone === "error"
                          ? "bg-rose-500"
                          : "bg-gray-500"
                      }`}
                    ></span>
                  </span>
                  <span className="text-sm font-medium text-white">{status.message}</span>
                </div>
              </div>
              <OnboardingPanel
                indexingProgress={indexingProgress}
                repoUrl={repoUrl}
                setRepoUrl={setRepoUrl}
                accessToken={accessToken}
                setAccessToken={setAccessToken}
                isCloning={isCloning}
                onIndexRepository={handleIndexRepository}
              />
            </div>
          </div>
        ) : (
          /* FULL IDE WORKSPACE */
          <AIWorkspace
            repoPath={repoPath}
            repoId={activeRepoId}
            architecture={architecture}
            graphNodes={graphNodes}
            graphEdges={graphEdges}
            selectedNode={selectedNode}
            isArchitectureLoading={isArchitectureLoading}
            isGraphLoadingReactFlow={isGraphLoadingReactFlow}
            onNodeClick={handleNodeClick}
            onGetArchitecture={handleGetArchitecture}
            getFileColor={getFileColor}
            callGraph={callGraph}
            graphSearch={graphSearch}
            setGraphSearch={setGraphSearch}
            selectedFunc={selectedFunc}
            setSelectedFunc={setSelectedFunc}
            filteredFunctions={filteredFunctions}
            functionCallers={functionCallers}
            isGraphLoading={isGraphLoading}
            onGetCallGraph={handleGetCallGraph}
            architectureError={architectureError}
            callGraphError={callGraphError}
            indexingProgress={indexingProgress}
          />
        )}
      </ErrorBoundary>

      {showMfaModal && mfaTempToken && (
        <MfaVerificationModal
          tempToken={mfaTempToken}
          onSuccess={(verifiedToken: string, verifiedRefreshToken: string, verifiedUser: User) => {
            persistTokens(verifiedToken, verifiedRefreshToken);
            setToken(verifiedToken);
            setUser(verifiedUser);
            setShowMfaModal(false);
            setMfaTempToken("");
            showToast(`MFA Verified. Welcome back, ${verifiedUser.name}!`, "success");
          }}
          onCancel={() => {
            setShowMfaModal(false);
            setMfaTempToken("");
            setIsAuthLoading(false);
            showToast("MFA Verification cancelled.", "info");
          }}
        />
      )}
    </div>
  );
}