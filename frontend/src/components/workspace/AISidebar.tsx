import React, { lazy, Suspense, useState } from "react";
import { ChevronDown, MessageSquare, Bot, ClipboardList } from "lucide-react";
import ConversationPanel from "./ConversationPanel";

// Lazy-loaded components
const PatchHistory = lazy(() => import("../patch/PatchHistory"));
const AgentChat = lazy(() => import("../agents/AgentChat"));
const PatchViewer = lazy(() => import("../patch/PatchViewer"));
const PlannerWorkspace = lazy(() => import("../planner/PlannerWorkspace"));
const WorkspaceMemory = lazy(() => import("./WorkspaceMemory"));
const IntelligenceDashboard = lazy(() => import("./IntelligenceDashboard"));
const CollaborationPanel = lazy(() => import("./CollaborationPanel"));
const WorkspacePreferences = lazy(() => import("./WorkspacePreferences"));

interface AISidebarProps {
  collapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  activeTab: string;
  setActiveTab: (tabKey: string) => void;
  width: number;
  repoPath: string;
  activeFile: string;
  activeSymbol: string;
  selectionText: string;
  selectionRange: any;
  language: string;
  conversationId: string;
  messages: any[];
  isStreaming: boolean;
  onSendMessage: (payload: any) => void;
  onStop: () => void;
  onNewConversation: () => void;
  sessions: any[];
  onLoadSession: (sessionId: string) => void;
  patch: any;
  patchHistory: any[];
  handleRequestPatch: (payload: any) => void;
  handleSelectHistory: (patch: any) => void;
  isPatchStreaming: boolean;
  onOpenFile: (path: string) => void;
  onApplyProfile: (profile: any) => void;
  repoId?: string;
}

interface SidebarTab {
  key: string;
  label: string;
  icon: string;
}

const TABS: SidebarTab[] = [
  { key: "chat", label: "Chat", icon: "💬" },
  { key: "agents", label: "Agents", icon: "🤖" },
  { key: "patch", label: "Patch", icon: "🩹" },
  { key: "planner", label: "Planner", icon: "📋" },
  { key: "history", label: "History", icon: "⏳" },
  { key: "workspace", label: "Workspace", icon: "💼" },
  { key: "intelligence", label: "Intel", icon: "⚡" },
  { key: "collaboration", label: "Collab", icon: "👥" },
  { key: "preferences", label: "Prefs", icon: "⚙️" },
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
  onOpenFile,
  onApplyProfile,
  repoId,
}: AISidebarProps) {
  const [showSwitcher, setShowSwitcher] = useState(false);

  const handleTabClick = (key: string) => {
    setActiveTab(key);
    if (collapsed) {
      onToggleCollapse(false);
    }
  };

  // Renders a narrow ribbon of icons if collapsed
  if (collapsed) {
    return (
      <div className="w-10 bg-panel border-l border-border flex flex-col items-center py-2 gap-4 h-full shrink-0 z-10 select-none">
        <button
          onClick={() => onToggleCollapse(false)}
          className="p-1.5 rounded-lg hover:bg-panel text-muted hover:text-text-strong transition-all mb-2 border border-transparent hover:border-border cursor-pointer"
          title="Expand Assistant Panel"
        >
          <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm relative transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-accent-dim/10 text-accent border border-accent/25"
                : "text-muted hover:text-text-strong hover:bg-panel"
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>
    );
  }

  const activeTabObj = TABS.find((t) => t.key === activeTab) || TABS[0];

  return (
    <div
      style={{ width: `${width}px` }}
      className="shrink-0 flex flex-col h-full bg-panel border-l border-border overflow-hidden z-10 transition-all"
    >
      {/* Horizontal Tabs Header Bar */}
      <div className="flex items-center justify-between border-b border-border bg-panel-alt px-2 py-1.5 shrink-0 select-none h-[42px] relative z-20">
        
        {/* Dropdown Selector */}
        <div className="relative flex-grow min-w-0">
          <button
            onClick={() => setShowSwitcher((s) => !s)}
            className="flex items-center gap-1.5 px-2 py-1 text-text-strong hover:text-white font-sans text-xs font-semibold select-none cursor-pointer w-full text-left justify-between bg-bg border border-border rounded-lg hover:bg-panel-alt-2 transition-colors"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="text-sm shrink-0">{activeTabObj.icon}</span>
              <span className="truncate">{activeTabObj.label}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0 ml-1" />
          </button>

          {showSwitcher && (
            <>
              {/* Backdrop overlay to close switcher */}
              <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowSwitcher(false)} />
              <div className="absolute top-[calc(100%+4px)] left-0 mt-1 w-52 bg-panel-alt-2 border border-border rounded-xl shadow-2xl p-1 z-50 animate-fade-in">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      handleTabClick(tab.key);
                      setShowSwitcher(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg text-xs font-sans transition-all cursor-pointer ${
                      activeTab === tab.key
                        ? "bg-accent-dim/10 text-accent font-semibold"
                        : "text-muted hover:text-text-strong hover:bg-panel-alt"
                    }`}
                  >
                    <span className="text-sm shrink-0">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick Access Icon Buttons */}
        <div className="flex items-center gap-0.5 shrink-0 px-1 border-l border-border/60 ml-2">
          {[
            { key: "chat", icon: MessageSquare, tooltip: "Chat" },
            { key: "agents", icon: Bot, tooltip: "Agents Coordinator" },
            { key: "planner", icon: ClipboardList, tooltip: "Planner Workspace" },
          ].map((action) => {
            const Icon = action.icon;
            const isActive = activeTab === action.key;
            return (
              <button
                key={action.key}
                onClick={() => handleTabClick(action.key)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer relative ${
                  isActive
                    ? "text-accent bg-accent-dim/10"
                    : "text-muted hover:text-text-strong hover:bg-panel-alt-2"
                }`}
                title={action.tooltip}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Collapse arrow toggle */}
        <button
          onClick={() => onToggleCollapse(true)}
          className="p-1.5 rounded-lg hover:bg-panel-alt-2 text-muted hover:text-text-strong transition-all border border-transparent hover:border-border ml-1 cursor-pointer shrink-0"
          title="Collapse Assistant Panel"
        >
          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Tabs panels viewport */}
      <div className="flex-grow flex-1 overflow-hidden min-h-0 relative">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-accent font-mono text-xs">
              <span className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin mr-2"></span>
              <span>Loading panel...</span>
            </div>
          }
        >
          {activeTab === "chat" && (
            React.createElement(ConversationPanel as any, {
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
            })
          )}

          {activeTab === "agents" && (
            React.createElement(AgentChat as any, {
              repoPath,
              activeFile,
              activeSymbol,
              selectionText,
            })
          )}

          {activeTab === "patch" && (
            React.createElement(PatchViewer as any, {
              status: patch?.status || "idle",
              summary: patch?.summary || "",
              activeFile,
              selectionRange,
              isStreaming: isPatchStreaming,
              onRequestPatch: handleRequestPatch,
            })
          )}

          {activeTab === "planner" && (
            React.createElement(PlannerWorkspace as any, {
              repoPath,
            })
          )}

          {activeTab === "history" && (
            <div className="p-3 h-full overflow-y-auto scrollbar-thin select-text">
              {React.createElement(PatchHistory as any, {
                history: patchHistory,
                onSelect: handleSelectHistory,
              })}
            </div>
          )}

          {activeTab === "workspace" && (
            React.createElement(WorkspaceMemory as any, {
              onOpenFile,
              onSendMessage,
              onClose: () => onToggleCollapse(true),
              repoPath,
              activeFile,
              activeSymbol,
              selectionRange,
              language,
              conversationId,
              isStreaming,
              onSelectTab: setActiveTab,
            })
          )}

          {activeTab === "intelligence" && (
            React.createElement(IntelligenceDashboard as any, {
              activeFile,
              onSendMessage,
              onClose: () => onToggleCollapse(true),
            })
          )}

          {activeTab === "collaboration" && (
            React.createElement(CollaborationPanel as any, {
              activeFile,
              repoId,
              onClose: () => onToggleCollapse(true),
            })
          )}

          {activeTab === "preferences" && (
            React.createElement(WorkspacePreferences as any, {
              onApplyProfile,
              onClose: () => onToggleCollapse(true),
            })
          )}
        </Suspense>
      </div>
    </div>
  );
}
