import { useState, useCallback } from "react";
import FileExplorer from "../explorer/FileExplorer";
import MonacoFileViewer from "../editor/MonacoFileViewer";
import ConversationPanel from "./ConversationPanel";
import WorkspaceHeader from "./WorkspaceHeader";
import useWorkspace from "../../hooks/useWorkspace";
import useSelection from "../../hooks/useSelection";
import useConversation from "../../hooks/useConversation";

// Bottom dock panels (lazy imported via tab key)
import ArchitectureTab from "../../tabs/ArchitectureTab";
import RepositoryReviewTab from "../../tabs/RepositoryReviewTab";
import RepositoryAnalyticsTab from "../../tabs/RepositoryAnalyticsTab";
import CallGraphTab from "../../tabs/CallGraphTab";

const BOTTOM_TABS = [
  { key: "architecture", label: "Architecture", icon: "🧩" },
  { key: "review", label: "AI Review", icon: "🔍" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "graph", label: "Call Graph", icon: "🕸️" },
];

function BottomDock({
  activePanel,
  onSelectPanel,
  onClose,
  repoPath,
  callGraph,
  graphSearch,
  setGraphSearch,
  selectedFunc,
  setSelectedFunc,
  isGraphLoading,
  onGetCallGraph,
  filteredFunctions,
  functionCallers,
  isArchitectureLoading,
  isGraphLoadingReactFlow,
  graphNodes,
  graphEdges,
  selectedNode,
  onNodeClick,
  onExplainFile,
  getFileColor,
  architecture,
  onGetArchitecture,
}) {
  return (
    <div className="flex flex-col h-full border-t border-white/5 bg-[#07090f]">
      {/* Dock tab bar */}
      <div className="flex items-center gap-0 border-b border-white/5 shrink-0 bg-[#090c14]">
        {BOTTOM_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSelectPanel(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 ${
              activePanel === tab.key
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/3"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
        <div className="ml-auto pr-2">
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-white/5 rounded transition-all"
            title="Close panel"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dock content */}
      <div className="flex-1 overflow-auto">
        {activePanel === "architecture" && (
          <div className="h-full p-4">
            <ArchitectureTab
              architecture={architecture}
              graphNodes={graphNodes}
              graphEdges={graphEdges}
              selectedNode={selectedNode}
              isArchitectureLoading={isArchitectureLoading}
              isGraphLoadingReactFlow={isGraphLoadingReactFlow}
              onNodeClick={onNodeClick}
              onExplainFile={onExplainFile}
              onOpenFile={() => {}}
              onGetArchitecture={onGetArchitecture}
              getFileColor={getFileColor}
            />
          </div>
        )}
        {activePanel === "review" && (
          <div className="h-full p-4">
            <RepositoryReviewTab repoPath={repoPath} />
          </div>
        )}
        {activePanel === "analytics" && (
          <div className="h-full p-4">
            <RepositoryAnalyticsTab repoPath={repoPath} />
          </div>
        )}
        {activePanel === "graph" && (
          <div className="h-full p-4">
            <CallGraphTab
              callGraph={callGraph}
              graphSearch={graphSearch}
              setGraphSearch={setGraphSearch}
              selectedFunc={selectedFunc}
              setSelectedFunc={setSelectedFunc}
              filteredFunctions={filteredFunctions}
              functionCallers={functionCallers}
              isGraphLoading={isGraphLoading}
              onGetCallGraph={onGetCallGraph}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIWorkspace({
  repoPath,
  // Pass-through props from App for bottom dock panels
  architecture,
  graphNodes,
  graphEdges,
  selectedNode,
  isArchitectureLoading,
  isGraphLoadingReactFlow,
  onNodeClick,
  onExplainFile,
  onGetArchitecture,
  getFileColor,
  callGraph,
  graphSearch,
  setGraphSearch,
  selectedFunc,
  setSelectedFunc,
  filteredFunctions,
  functionCallers,
  isGraphLoading,
  onGetCallGraph,
}) {
  const workspace = useWorkspace();
  const {
    selectionText,
    selectionRange,
    language,
    handleSelectionChange,
    clearSelection,
  } = useSelection(workspace.activeFile);

  const conversation = useConversation();

  const [bottomPanel, setBottomPanel] = useState(null); // null | panel key
  const [bottomHeight, setBottomHeight] = useState(340); // px
  const [isDragging, setIsDragging] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);

  // When a file is clicked in explorer, open it in the editor
  const handleExplorerFileOpen = useCallback(
    (filePath) => {
      workspace.openFile(filePath);
    },
    [workspace]
  );

  // Open a bottom dock panel; close if already open with same key
  const openDockPanel = useCallback((key) => {
    setBottomPanel((prev) => (prev === key ? null : key));
  }, []);

  // Vertical resize drag
  const handleResizeDragStart = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(true);
      const startY = e.clientY;
      const startHeight = bottomHeight;

      const onMove = (ev) => {
        const delta = startY - ev.clientY;
        setBottomHeight(Math.max(180, Math.min(600, startHeight + delta)));
      };
      const onUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [bottomHeight]
  );

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#07090f]">
      {/* Top header bar */}
      <WorkspaceHeader repoPath={repoPath} activeFile={workspace.activeFile} />

      {/* Main 3-pane body */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ─── PANE 1: File Explorer ───────────────────────────────────── */}
        <div
          className={`shrink-0 border-r border-white/5 bg-[#080b12] flex flex-col transition-all duration-200 ${
            explorerCollapsed ? "w-8" : "w-56"
          }`}
        >
          {/* Explorer collapse toggle */}
          <div className="flex items-center justify-between px-2 h-9 border-b border-white/5 shrink-0">
            {!explorerCollapsed && (
              <span className="text-[9px] uppercase font-bold tracking-widest text-gray-600 font-mono">Explorer</span>
            )}
            <button
              onClick={() => setExplorerCollapsed((v) => !v)}
              className="ml-auto p-1 rounded hover:bg-white/5 text-gray-600 hover:text-gray-300 transition-all"
              title={explorerCollapsed ? "Expand Explorer" : "Collapse Explorer"}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ transform: explorerCollapsed ? "scaleX(-1)" : "none" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {!explorerCollapsed && (
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
              <FileExplorer
                repoPath={repoPath}
                selectedPath={workspace.activeFile}
                onOpenFile={handleExplorerFileOpen}
                compact
              />
            </div>
          )}
        </div>

        {/* ─── PANE 2: Monaco Editor (center) ──────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-white/5">
          {/* Editor tabs / breadcrumb */}
          <div className="flex items-center gap-0 h-9 border-b border-white/5 bg-[#090c14] shrink-0 overflow-x-auto scrollbar-thin">
            {workspace.activeFile ? (
              <div className="flex items-center gap-1.5 px-3 h-full border-r border-white/5 bg-[#0d1117]">
                <span className="text-[10px] text-gray-400 font-mono truncate max-w-[280px]">
                  {workspace.activeFile.split(/[\\/]/).pop()}
                </span>
                <button
                  onClick={() => { workspace.openFile(null); clearSelection(); }}
                  className="text-gray-700 hover:text-gray-300 ml-1"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <span className="px-3 text-[10px] text-gray-700 font-mono italic">No file open</span>
            )}

            {/* Dock panel launch buttons */}
            <div className="ml-auto flex items-center px-2 gap-1">
              {BOTTOM_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => openDockPanel(tab.key)}
                  title={tab.label}
                  className={`px-2 py-1 text-[9px] font-mono font-bold rounded transition-all ${
                    bottomPanel === tab.key
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-gray-600 hover:text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Monaco editor fills remaining vertical space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MonacoFileViewer
              filePath={workspace.activeFile}
              content={workspace.activeFileContent}
              loading={workspace.isFileLoading}
              editorRef={workspace.editorRef}
              repoPath={repoPath}
              onSelectionChange={handleSelectionChange}
              onExplainSymbol={(sym) => {
                workspace.setActiveSymbol(sym);
                conversation.sendMessage({
                  repo: repoPath,
                  file: workspace.activeFile,
                  symbol: sym,
                  selection: "",
                  message: `/explain ${sym}`,
                });
              }}
            />
          </div>

          {/* Bottom resize drag handle */}
          {bottomPanel && (
            <div
              className={`h-1 cursor-row-resize bg-white/5 hover:bg-indigo-500/30 transition-colors shrink-0 ${isDragging ? "bg-indigo-500/40" : ""}`}
              onMouseDown={handleResizeDragStart}
            />
          )}

          {/* ─── Bottom Dock Panel ────────────────────────────────────── */}
          {bottomPanel && (
            <div className="shrink-0 overflow-hidden" style={{ height: `${bottomHeight}px` }}>
              <BottomDock
                activePanel={bottomPanel}
                onSelectPanel={openDockPanel}
                onClose={() => setBottomPanel(null)}
                repoPath={repoPath}
                architecture={architecture}
                graphNodes={graphNodes}
                graphEdges={graphEdges}
                selectedNode={selectedNode}
                isArchitectureLoading={isArchitectureLoading}
                isGraphLoadingReactFlow={isGraphLoadingReactFlow}
                onNodeClick={onNodeClick}
                onExplainFile={onExplainFile}
                getFileColor={getFileColor}
                onGetArchitecture={onGetArchitecture}
                callGraph={callGraph}
                graphSearch={graphSearch}
                setGraphSearch={setGraphSearch}
                selectedFunc={selectedFunc}
                setSelectedFunc={setSelectedFunc}
                filteredFunctions={filteredFunctions}
                functionCallers={functionCallers}
                isGraphLoading={isGraphLoading}
                onGetCallGraph={onGetCallGraph}
              />
            </div>
          )}
        </div>

        {/* ─── PANE 3: AI Conversation ──────────────────────────────── */}
        <div className="w-[360px] xl:w-[400px] shrink-0 flex flex-col overflow-hidden">
          <ConversationPanel
            repoPath={repoPath}
            activeFile={workspace.activeFile}
            activeSymbol={workspace.activeSymbol}
            selectionText={selectionText}
            selectionRange={selectionRange}
            language={language}
            conversationId={conversation.conversationId}
            messages={conversation.messages}
            isStreaming={conversation.isStreaming}
            onSendMessage={conversation.sendMessage}
            onStop={conversation.stopStreaming}
            onNewConversation={conversation.startNewConversation}
            sessions={conversation.sessions}
            onLoadSession={conversation.loadSession}
          />
        </div>
      </div>
    </div>
  );
}
