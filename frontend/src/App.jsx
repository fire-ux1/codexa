import { useState, useEffect, useMemo } from "react";
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

// Hooks
import useToast from "./hooks/useToast";
import useRepository from "./hooks/useRepository";
import useArchitecture from "./hooks/useArchitecture";
import useCallGraph from "./hooks/useCallGraph";
import useExecutionFlow from "./hooks/useExecutionFlow";

// Utilities
import { statusTones } from "./utils/constants";
import { getFileColor } from "./utils/colors";

const getInitialToken = () => {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    localStorage.setItem("codepilot_token", urlToken);
    return urlToken;
  }
  return localStorage.getItem("codepilot_token") || "";
};

export default function App() {
  // Authentication & History States
  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showSandboxForm, setShowSandboxForm] = useState(false);
  const [sandboxName, setSandboxName] = useState("Sandbox Developer");
  const [sandboxEmail, setSandboxEmail] = useState("sandbox@codepilot.ai");



  // Hooks Integration
  const { toasts, showToast } = useToast();

  const {
    repoUrl,
    setRepoUrl,
    repoPath,
    isCloning,
    indexingProgress,
    status,
    setStatus,
    clearWorkspace,
    selectRepositoryFromHistory,
    handleDeleteRepository,
    handleIndexRepository,
  } = useRepository(token, showToast, history, setHistory);

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
  } = useArchitecture(repoPath, setStatus, getFileColor);

  const {
    callGraph,
    setCallGraph,
    isGraphLoading,
    graphSearch,
    setGraphSearch,
    selectedFunc,
    setSelectedFunc,
    handleGetCallGraph,
  } = useCallGraph(repoPath, setStatus);

  const {
    setFlowData,
  } = useExecutionFlow(repoPath, setStatus);


  // 1. Authenticate user on load and check URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast("Authentication successful!", "success");
    }

    const loadUserAndHistory = async () => {
      const activeToken = localStorage.getItem("codepilot_token");
      if (activeToken) {
        try {
          const profile = await fetchUser();
          setUser(profile);
          const historyList = await fetchRepositories();
          setHistory(historyList);

          // If there's a recent completed repository, select it
          if (historyList.length > 0) {
            const latest = historyList.find((r) => r.status === "completed") || historyList[0];
            if (latest.status === "completed") {
              selectRepositoryFromHistory(latest);
            }
          }
        } catch (error) {
          console.error("Auth Load Error:", error);
          localStorage.removeItem("codepilot_token");
          setToken("");
          setUser(null);
        }
      }
      setIsAuthLoading(false);
    };

    loadUserAndHistory();
  }, [token, selectRepositoryFromHistory, showToast]);

  const activeRepo = history.find((r) => r.repository_path === repoPath);
  const activeRepoId = activeRepo ? activeRepo.id : null;
  const repositoryReady = Boolean(repoPath);


  // Sandbox login helper
  const handleSandboxLogin = async (e) => {
    e.preventDefault();
    try {
      setIsAuthLoading(true);
      const res = await loginDeveloper(sandboxName, sandboxEmail);
      setToken(res.token);
      setUser(res.user);
      setShowSandboxForm(false);
      showToast(`Logged in as Sandbox Session: ${res.user.name}`, "success");
    } catch {
      showToast("Developer login failed.", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Sign out helper
  const handleSignOut = () => {
    localStorage.removeItem("codepilot_token");
    setToken("");
    setUser(null);
    setHistory([]);
    clearWorkspace();
    setArchitecture("");
    setCallGraph(null);
    setFlowData(null);
    setSelectedFunc(null);
    setSelectedNode(null);
    showToast("Signed out successfully.", "info");
  };

  // Handle repository selection override
  const handleSelectRepository = (repo) => {
    selectRepositoryFromHistory(repo);
    setArchitecture("");
    setCallGraph(null);
    setFlowData(null);
    setSelectedFunc(null);
    setSelectedNode(null);
  };

  // Ask AI about the selected file (used by architecture tab onExplainFile)
  const handleExplainFile = () => {};

  const filteredFunctions = useMemo(() => {
    if (!callGraph) return [];
    const keys = Object.keys(callGraph);
    if (!graphSearch.trim()) return keys;
    return keys.filter((key) => key.toLowerCase().includes(graphSearch.toLowerCase()));
  }, [callGraph, graphSearch]);

  const functionCallers = useMemo(() => {
    if (!callGraph || !selectedFunc) return [];
    const callers = [];
    Object.entries(callGraph).forEach(([funcName, callees]) => {
      if (callees.includes(selectedFunc) && funcName !== selectedFunc) {
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
          <p className="text-gray-400 font-medium text-sm">Authenticating CodePilot Session...</p>
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
      />
    );
  }

  // 2. MAIN APPLICATION WORKSPACE
  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden">
      {/* Toast Alert Notification system */}
      <ToastContainer toasts={toasts} />

      {!repositoryReady ? (
        /* ONBOARDING STATE */
        <div className="flex flex-col md:flex-row flex-1 min-h-screen">
          <Sidebar
            user={user}
            history={history}
            repoPath={repoPath}
            onSignOut={handleSignOut}
            onClearWorkspace={clearWorkspace}
            onSelectRepo={handleSelectRepository}
            onDeleteRepo={handleDeleteRepository}
          />
          <div className="flex-grow p-4 md:p-6 lg:p-8">
            {/* Status Bar */}
            <div className={`mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border ${statusTones[status.tone]} transition-all duration-300 glass overflow-hidden`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.tone === 'loading' ? 'bg-indigo-400' : status.tone === 'success' ? 'bg-emerald-400' : status.tone === 'error' ? 'bg-rose-400' : 'bg-gray-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.tone === 'loading' ? 'bg-indigo-500' : status.tone === 'success' ? 'bg-emerald-500' : status.tone === 'error' ? 'bg-rose-500' : 'bg-gray-500'}`}></span>
                </span>
                <span className="text-sm font-medium text-white">{status.message}</span>
              </div>
            </div>
            <OnboardingPanel
              indexingProgress={indexingProgress}
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
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
          onExplainFile={handleExplainFile}
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
        />
      )}
    </div>
  );
}
