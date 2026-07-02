import { lazy, Suspense } from "react";
import ConversationPanel from "./ConversationPanel";

// Lazy-loaded components
const PatchHistory = lazy(() => import("../patch/PatchHistory"));
const AgentChat = lazy(() => import("../agents/AgentChat"));
const PatchViewer = lazy(() => import("../patch/PatchViewer"));
const PlannerWorkspace = lazy(() => import("../planner/PlannerWorkspace"));
const ContextPanel = lazy(() => import("./ContextPanel"));

const TABS = [
  { key: "chat", label: "Chat", icon: "💬" },
  { key: "agents", label: "Agents", icon: "🤖" },
  { key: "patch", label: "Patch", icon: "🩹" },
  { key: "planner", label: "Planner", icon: "📋" },
  { key: "history", label: "History", icon: "⏳" },
  { key: "workspace", label: "Workspace", icon: "💼" },
];

export default function AISidebar({
  collapsed,
  onToggleCollapse,
  activeTab,
  setActiveTab,
  width,
  repoPath,
  activeFile,
  activeSymbol,
  selectionText,
  selectionRange,
  language,
  conversationId,
  messages,
  isStreaming,
  onSendMessage,
  onStop,
  onNewConversation,
  sessions,
  onLoadSession,
  patch,
  patchHistory,
  handleRequestPatch,
  handleSelectHistory,
  isPatchStreaming,
}) {
  const handleTabClick = (key) => {
    setActiveTab(key);
    if (collapsed) {
      onToggleCollapse(false);
    }
  };

  // Renders a narrow ribbon of icons if collapsed
  if (collapsed) {
    return (
      <div className="w-10 bg-[#0c0f16] border-l border-[#1c2230] flex flex-col items-center py-2 gap-4 h-full shrink-0 z-10 select-none">
        <button
          onClick={() => onToggleCollapse(false)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all mb-2 border border-transparent hover:border-[#1c2230]"
          title="Expand Assistant Panel"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm relative transition-all ${
              activeTab === tab.key
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{ width: `${width}px` }}
      className="shrink-0 flex flex-col h-full bg-[#0f1219] border-l border-[#1c2230] overflow-hidden z-10 transition-all"
    >
      {/* Horizontal Tabs Header Bar */}
      <div className="flex items-center border-b border-[#1c2230] bg-[#0c0f16] shrink-0 select-none pr-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`flex-1 py-2 px-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 flex flex-col items-center gap-0.5 ${
              activeTab === tab.key
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/3"
            }`}
          >
            <span className="text-xs">{tab.icon}</span>
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
        {/* Collapse arrow toggle */}
        <button
          onClick={() => onToggleCollapse(true)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all border border-transparent hover:border-[#1c2230] ml-1 mr-1"
          title="Collapse Assistant Panel"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Tabs panels viewport */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-indigo-400">
              <span className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mr-2"></span>
              <span className="font-mono text-xs">Loading panel...</span>
            </div>
          }
        >
          {activeTab === "chat" && (
            <ConversationPanel
              repoPath={repoPath}
              activeFile={activeFile}
              activeSymbol={activeSymbol}
              selectionText={selectionText}
              selectionRange={selectionRange}
              language={language}
              conversationId={conversationId}
              messages={messages}
              isStreaming={isStreaming}
              onSendMessage={onSendMessage}
              onStop={onStop}
              onNewConversation={onNewConversation}
              sessions={sessions}
              onLoadSession={onLoadSession}
            />
          )}

          {activeTab === "agents" && (
            <AgentChat
              repoPath={repoPath}
              activeFile={activeFile}
              activeSymbol={activeSymbol}
              selectionText={selectionText}
            />
          )}

          {activeTab === "patch" && (
            <PatchViewer
              status={patch?.status || "idle"}
              summary={patch?.summary || ""}
              activeFile={activeFile}
              selectionRange={selectionRange}
              isStreaming={isPatchStreaming}
              onRequestPatch={handleRequestPatch}
            />
          )}

          {activeTab === "planner" && (
            <PlannerWorkspace
              repoPath={repoPath}
            />
          )}

          {activeTab === "history" && (
            <div className="p-3 h-full overflow-y-auto scrollbar-thin select-text">
              <PatchHistory
                history={patchHistory}
                onSelect={handleSelectHistory}
              />
            </div>
          )}

          {activeTab === "workspace" && (
            <ContextPanel
              repoPath={repoPath}
              activeFile={activeFile}
              activeSymbol={activeSymbol}
              selectionRange={selectionRange}
              language={language}
              conversationId={conversationId}
              isStreaming={isStreaming}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
