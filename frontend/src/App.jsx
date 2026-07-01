import { useMemo, useState, useEffect, useRef } from "react";
import {
  fetchUser,
  fetchRepositories,
  fetchFileContent,
  askQuestion,
  loginDeveloper,
} from "./services/api";

import {
  IconCpu,
  IconNetwork,
  IconFlow,
  IconTerminal,
  IconSearch,
  IconFolder,
  IconCode,
  IconDatabase,
} from "./components/icons/Icons";

import ToastContainer from "./components/common/ToastContainer";
import LoginScreen from "./components/auth/LoginScreen";
import Sidebar from "./components/sidebar/Sidebar";
import WorkspaceInfo from "./components/workspace/WorkspaceInfo";
import FileExplorer from "./components/explorer/FileExplorer";
import AnalyzerPanel from "./components/workspace/AnalyzerPanel";
import AssistantPanel from "./components/workspace/AssistantPanel";
import FilePreviewModal from "./components/common/FilePreviewModal";
import OnboardingPanel from "./components/workspace/OnboardingPanel";
import OverviewTab from "./tabs/OverviewTab";
import ChatTab from "./tabs/ChatTab";
import ArchitectureTab from "./tabs/ArchitectureTab";
import CallGraphTab from "./tabs/CallGraphTab";
import FlowTab from "./tabs/FlowTab";
import SearchTab from "./tabs/SearchTab";
import RepositoryReviewTab from "./tabs/RepositoryReviewTab";
import RepositoryAnalyticsTab from "./tabs/RepositoryAnalyticsTab";

// Hooks
import useToast from "./hooks/useToast";
import useRepository from "./hooks/useRepository";
import useChat from "./hooks/useChat";
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

  const [activeTab, setActiveTab] = useState("overview");

  // Semantic Code Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState(null);
  const [previewInitialLine, setPreviewInitialLine] = useState(null);

  // Copy/Toast States
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Hooks Integration
  const { toasts, showToast } = useToast();

  const {
    repoUrl,
    setRepoUrl,
    repoPath,
    isCloning,
    indexingProgress,
    metrics,
    status,
    setStatus,
    clearWorkspace,
    selectRepositoryFromHistory,
    handleDeleteRepository,
    handleIndexRepository,
  } = useRepository(token, showToast, history, setHistory);

  const {
    question,
    setQuestion,
    chatHistory,
    setChatHistory,
    isAsking,
    handleAskQuestion,
  } = useChat(repoPath, setStatus);

  const {
    architecture,
    setArchitecture,
    graphNodes,
    graphEdges,
    selectedNode,
    setSelectedNode,
    isArchitectureLoading,
    isGraphLoadingReactFlow,
    previewContent,
    setPreviewContent,
    isPreviewLoading,
    setIsPreviewLoading,
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
    flowData,
    setFlowData,
    isFlowLoading,
    handleGetFlow,
  } = useExecutionFlow(repoPath, setStatus);

  // Refs
  const chatBottomRef = useRef(null);

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

  // 2. Chat Auto-scroll
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isAsking]);

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
    setChatHistory([]);
    setArchitecture("");
    setCallGraph(null);
    setFlowData(null);
    setSelectedFunc(null);
    setSelectedNode(null);
    setSearchResults([]);
    showToast("Signed out successfully.", "info");
  };

  // Handle repository selection override
  const handleSelectRepository = (repo) => {
    selectRepositoryFromHistory(repo);
    setChatHistory([]);
    setArchitecture("");
    setCallGraph(null);
    setFlowData(null);
    setSelectedFunc(null);
    setSelectedNode(null);
    setSearchResults([]);
  };

  // Ask AI about the selected file
  const handleExplainFile = () => {
    if (!selectedNode) return;
    handleAskQuestion(`Explain the file path: ${selectedNode.id}`);
    setActiveTab("chat");
  };

  // Semantic search call
  const handleSemanticSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearchingSemantic(true);
      const res = await askQuestion(searchQuery, repoPath);
      setSearchResults(res.sources || []);
      showToast(`Semantic search matched ${res.sources.length} items`, "success");
    } catch {
      showToast("Semantic search failed", "error");
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  // Quick preview file content
  const openFilePreviewModal = async (filePath, initialLine = null) => {
    setPreviewFile(filePath);
    setPreviewInitialLine(initialLine);
    try {
      setIsPreviewLoading(true);
      const res = await fetchFileContent(filePath);
      setPreviewContent(res.content);
    } catch {
      setPreviewContent("Error loading file content.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleInspectSymbol = (symbolName) => {
    if (callGraph && callGraph[symbolName]) {
      setSelectedFunc(symbolName);
      setActiveTab("graph");
    } else {
      setQuestion(`Explain function or module: ${symbolName}`);
      setActiveTab("chat");
    }
  };

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

  const copyTextToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
    <div className="min-h-screen relative pb-10 flex flex-col md:flex-row gap-0">
      
      {/* Toast Alert Notification system */}
      <ToastContainer toasts={toasts} />

      {/* LEFT SIDEBAR */}
      <Sidebar
        user={user}
        history={history}
        repoPath={repoPath}
        onSignOut={handleSignOut}
        onClearWorkspace={clearWorkspace}
        onSelectRepo={handleSelectRepository}
        onDeleteRepo={handleDeleteRepository}
      />

      {/* RIGHT SIDE WORKSPACE CANVAS */}
      <div className="flex-grow p-4 md:p-6 lg:p-8 relative z-10 max-w-7xl mx-auto w-full">
        
        {/* TOP STATUS BAR */}
        <div className={`mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border ${statusTones[status.tone]} transition-all duration-300 glass overflow-hidden`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.tone === 'loading' ? 'bg-indigo-400' : status.tone === 'success' ? 'bg-emerald-400' : status.tone === 'error' ? 'bg-rose-400' : 'bg-gray-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.tone === 'loading' ? 'bg-indigo-500' : status.tone === 'success' ? 'bg-emerald-500' : status.tone === 'error' ? 'bg-rose-500' : 'bg-gray-500'}`}></span>
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-xs uppercase tracking-wider font-semibold opacity-75 mr-2 shrink-0">[{status.label}]</span>
              <span className="text-sm font-medium text-white break-words">{status.message}</span>
            </div>
          </div>
          {repositoryReady && (
            <button 
              onClick={clearWorkspace}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/20 transition-all font-medium flex items-center gap-2"
            >
              Close Workspace
            </button>
          )}
        </div>

        {/* ONBOARDING STATE OR LOADER OR CANVAS */}
        {!repositoryReady ? (
          <OnboardingPanel
            indexingProgress={indexingProgress}
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            isCloning={isCloning}
            onIndexRepository={handleIndexRepository}
          />
        ) : (
          /* ACTIVE WORKSPACE */
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
            
            {/* LEFT ACTIONS COLLAPSIBLE DRAWER */}
            <div className="space-y-6 lg:sticky lg:top-6">
              <WorkspaceInfo repoPath={repoPath} metrics={metrics} />
              <FileExplorer
                repoPath={repoPath}
                selectedPath={previewFile}
                onOpenFile={openFilePreviewModal}
              />
              <AnalyzerPanel
                onGetArchitecture={handleGetArchitecture}
                onGetCallGraph={handleGetCallGraph}
                onGetFlow={handleGetFlow}
                isArchitectureLoading={isArchitectureLoading}
                isGraphLoading={isGraphLoading}
                isFlowLoading={isFlowLoading}
              />
              <AssistantPanel
                question={question}
                setQuestion={setQuestion}
                isAsking={isAsking}
                onAskQuestion={handleAskQuestion}
              />
            </div>

            {/* RIGHT SIDE ACTIVE TAB MAIN CANVAS */}
            <div className="space-y-6">

              {/* Tab Switch Headers */}
              <div className="p-2 rounded-2xl border border-white/10 bg-gray-900/60 flex flex-wrap gap-1 glass">
                {[
                  { key: "overview", label: "Overview", icon: IconFolder },
                  { key: "chat", label: "Streaming Chat", icon: IconTerminal },
                  { key: "architecture", label: "Interactive Architecture", icon: IconCpu },
                  { key: "graph", label: "Call Graph", icon: IconNetwork },
                  { key: "flow", label: "Execution Flow", icon: IconFlow },
                  { key: "search", label: "Semantic Search", icon: IconSearch },
                  { key: "review", label: "Repository Review", icon: IconCode },
                  { key: "analytics", label: "Repository Analytics", icon: IconDatabase },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 min-w-[80px] py-3 px-2 rounded-xl text-[10px] sm:text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 overflow-hidden ${
                        active
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <TabIcon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Panels Canvas */}
              <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-gray-900/40 backdrop-blur-xl shadow-2xl glass relative min-h-[550px] flex flex-col justify-between">
                {activeTab === "overview" && (
                  <OverviewTab
                    metrics={metrics}
                    onGetArchitecture={handleGetArchitecture}
                    onGetCallGraph={handleGetCallGraph}
                    onGetFlow={handleGetFlow}
                    onSetActiveTab={setActiveTab}
                    onAskQuestion={handleAskQuestion}
                  />
                )}
                {activeTab === "chat" && (
                  <ChatTab
                    chatHistory={chatHistory}
                    isAsking={isAsking}
                    copiedIndex={copiedIndex}
                    onCopy={copyTextToClipboard}
                    onOpenFile={openFilePreviewModal}
                    chatBottomRef={chatBottomRef}
                  />
                )}
                {activeTab === "architecture" && (
                  <ArchitectureTab
                    architecture={architecture}
                    graphNodes={graphNodes}
                    graphEdges={graphEdges}
                    selectedNode={selectedNode}
                    isArchitectureLoading={isArchitectureLoading}
                    isGraphLoadingReactFlow={isGraphLoadingReactFlow}
                    onNodeClick={handleNodeClick}
                    onExplainFile={handleExplainFile}
                    onOpenFile={openFilePreviewModal}
                    onGetArchitecture={handleGetArchitecture}
                    getFileColor={getFileColor}
                  />
                )}
                {activeTab === "graph" && (
                  <CallGraphTab
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
                {activeTab === "flow" && (
                  <FlowTab
                    flowData={flowData}
                    isFlowLoading={isFlowLoading}
                    onGetFlow={handleGetFlow}
                    onInspectSymbol={handleInspectSymbol}
                  />
                )}
                {activeTab === "search" && (
                  <SearchTab
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchResults={searchResults}
                    isSearchingSemantic={isSearchingSemantic}
                    onSearch={handleSemanticSearch}
                    onOpenFile={openFilePreviewModal}
                  />
                )}
                {activeTab === "review" && (
                  <RepositoryReviewTab repoPath={repoPath} />
                )}
                {activeTab === "analytics" && (
                  <RepositoryAnalyticsTab repoPath={repoPath} />
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* FILE PREVIEW MODAL */}
      <FilePreviewModal
        previewFile={previewFile}
        previewContent={previewContent}
        isPreviewLoading={isPreviewLoading}
        onClose={() => {
          setPreviewFile(null);
          setPreviewInitialLine(null);
        }}
        initialLine={previewInitialLine}
        repoPath={repoPath}
        onOpenFile={openFilePreviewModal}
        onExplainSymbolGlobal={(word) => {
          handleAskQuestion(`Explain function or class: ${word}`);
          setActiveTab("chat");
        }}
      />

    </div>
  );
}
