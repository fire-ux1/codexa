import { useState, useCallback, useRef } from "react";
import FileExplorer from "../explorer/FileExplorer";
import MonacoFileViewer from "../editor/MonacoFileViewer";
import ConversationPanel from "./ConversationPanel";
import WorkspaceHeader from "./WorkspaceHeader";
import useWorkspace from "../../hooks/useWorkspace";
import useSelection from "../../hooks/useSelection";
import useConversation from "../../hooks/useConversation";

// Patch components
import DiffViewer from "../patch/DiffViewer";
import PatchToolbar from "../patch/PatchToolbar";
import PatchViewer from "../patch/PatchViewer";
import PatchHistory from "../patch/PatchHistory";

// Patch service
import { runPatchStream, commitPatch } from "../../services/patch";

// Git & Agent components
import GitPanel from "../git/GitPanel";
import AgentChat from "../agents/AgentChat";

// Bottom dock panels
import ArchitectureTab from "../../tabs/ArchitectureTab";
import RepositoryReviewTab from "../../tabs/RepositoryReviewTab";
import RepositoryAnalyticsTab from "../../tabs/RepositoryAnalyticsTab";
import CallGraphTab from "../../tabs/CallGraphTab";

const BOTTOM_TABS = [
  { key: "architecture", label: "Architecture", icon: "🧩" },
  { key: "review", label: "AI Review", icon: "🔍" },
  { key: "analytics", label: "Analytics", icon: "📊" },
  { key: "graph", label: "Call Graph", icon: "🕸️" },
  { key: "git", label: "Git", icon: "🐙" },
];

// Right sidebar sub-panels for the AI pane
const RIGHT_TABS = [
  { key: "chat", label: "Chat" },
  { key: "agents", label: "Agents" },
  { key: "patch", label: "Patch" },
  { key: "history", label: "History" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Bottom Dock
// ─────────────────────────────────────────────────────────────────────────────
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
  filteredFunctions,
  functionCallers,
  isGraphLoading,
  onGetCallGraph,
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
        {activePanel === "git" && (
          <div className="h-full">
            <GitPanel repoPath={repoPath} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Patch State — initial shape
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_PATCH = {
  status: "idle",       // "idle" | "generating" | "ready" | "applied" | "rejected"
  instruction: null,
  summary: null,
  originalContent: null,
  modifiedContent: null,
  diff: null,
  file: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// AIWorkspace
// ─────────────────────────────────────────────────────────────────────────────
export default function AIWorkspace({
  repoPath,
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

  // Layout state
  const [bottomPanel, setBottomPanel] = useState(null);
  const [bottomHeight, setBottomHeight] = useState(340);
  const [isDragging, setIsDragging] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [rightTab, setRightTab] = useState("chat"); // chat | patch | history

  // ── Patch state ──────────────────────────────────────────────────────────
  const [patch, setPatch] = useState(INITIAL_PATCH);
  const [patchHistory, setPatchHistory] = useState([]);   // array of past patches
  const [undoStack, setUndoStack] = useState([]);         // {file, content} snapshots
  const streamAbortRef = useRef(null);

  // Open a bottom dock panel; toggle if already open
  const handleExplorerFileOpen = useCallback(
    (filePath) => {
      workspace.openFile(filePath);
      // If patch is active for a different file, reset it
      setPatch((p) => (p.file && p.file !== filePath ? INITIAL_PATCH : p));
    },
    [workspace]
  );

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

  // ─── Patch: Request patch from AI ─────────────────────────────────────────
  const handleRequestPatch = useCallback(
    async (instruction) => {
      if (!workspace.activeFile || !workspace.activeFileContent) return;

      // Switch to patch tab so user sees progress
      setRightTab("patch");

      const originalContent = workspace.activeFileContent;
      const targetFile = workspace.activeFile;

      setPatch({
        ...INITIAL_PATCH,
        status: "generating",
        instruction,
        file: targetFile,
        originalContent,
      });

      const payload = {
        instruction,
        file_path: targetFile,
        content: selectionText || originalContent,
        selection_range: selectionRange || null,
        repo: repoPath,
      };

      let doneData = null;

      try {
        // Create new AbortController for this stream
        const controller = new AbortController();
        streamAbortRef.current = controller;

        const resp = await runPatchStream({ ...payload, signal: controller.signal });
        if (!resp.ok) throw new Error(`Patch request failed: ${resp.status}`);

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // keep any incomplete trailing line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.type === "done") {
                // Backend sends complete results in the final event
                doneData = parsed;
              }
            } catch {
              // ignore partial / non-JSON lines
            }
          }
        }

        if (doneData) {
          setPatch((prev) => ({
            ...prev,
            status: "ready",
            summary: doneData.summary || "",
            originalContent: doneData.original || originalContent,
            modifiedContent: doneData.updated || "",
            diff: doneData.diff || "",
          }));
        } else {
          setPatch((prev) => ({
            ...prev,
            status: "rejected",
            summary: "No changes were generated.",
          }));
        }
      } catch (err) {
        if (err.name === "AbortError") {
          setPatch((prev) => ({ ...prev, status: "rejected", summary: "Generation stopped." }));
        } else {
          console.error("[Patch] Stream error:", err);
          setPatch((prev) => ({ ...prev, status: "rejected", summary: "Error generating patch." }));
        }
      } finally {
        streamAbortRef.current = null;
      }
    },
    [workspace, selectionText, selectionRange, repoPath]
  );

  // ─── Patch: Stop streaming ────────────────────────────────────────────────
  const handleStopPatch = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
  }, []);

  // ─── Patch: Apply patch ───────────────────────────────────────────────────
  const handleApplyPatch = useCallback(async () => {
    if (!patch.modifiedContent || !patch.file) return;

    try {
      // Save undo snapshot before applying
      setUndoStack((prev) => [
        ...prev,
        { file: patch.file, content: patch.originalContent },
      ]);

      await commitPatch(patch.file, patch.modifiedContent);

      // Reload the file in workspace
      await workspace.openFile(patch.file);

      // Archive in history
      setPatchHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          instruction: patch.instruction,
          file: patch.file,
          status: "applied",
          summary: patch.summary,
          originalContent: patch.originalContent,
          modifiedContent: patch.modifiedContent,
        },
      ]);

      setPatch((prev) => ({ ...prev, status: "applied" }));
    } catch (err) {
      console.error("[Patch] Apply error:", err);
    }
  }, [patch, workspace]);

  // ─── Patch: Reject patch ──────────────────────────────────────────────────
  const handleRejectPatch = useCallback(() => {
    setPatchHistory((prev) => [
      ...prev,
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        instruction: patch.instruction,
        file: patch.file,
        status: "rejected",
        summary: patch.summary,
        originalContent: patch.originalContent,
        modifiedContent: patch.modifiedContent,
      },
    ]);
    setPatch((prev) => ({ ...prev, status: "rejected" }));
  }, [patch]);

  // ─── Patch: Undo last applied patch ──────────────────────────────────────
  const handleUndoPatch = useCallback(async () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    try {
      await commitPatch(last.file, last.content);
      await workspace.openFile(last.file);
      setUndoStack((prev) => prev.slice(0, -1));
      setPatch(INITIAL_PATCH);
    } catch (err) {
      console.error("[Patch] Undo error:", err);
    }
  }, [undoStack, workspace]);

  // ─── Patch: Copy modified code ────────────────────────────────────────────
  const handleCopyPatch = useCallback(() => {
    if (patch.modifiedContent) {
      navigator.clipboard.writeText(patch.modifiedContent).catch(() => {});
    }
  }, [patch]);

  // ─── Patch: Download .diff ────────────────────────────────────────────────
  const handleDownloadPatch = useCallback(() => {
    if (!patch.diff && !patch.modifiedContent) return;
    const content = patch.diff || patch.modifiedContent;
    const fileName = patch.file ? patch.file.split(/[\\/]/).pop() : "patch";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.diff`;
    a.click();
    URL.revokeObjectURL(url);
  }, [patch]);

  // ─── History: Restore a historical patch for review ───────────────────────
  const handleSelectHistory = useCallback((entry) => {
    setPatch({
      status: entry.status === "applied" ? "ready" : entry.status,
      instruction: entry.instruction,
      summary: entry.summary,
      originalContent: entry.originalContent,
      modifiedContent: entry.modifiedContent,
      diff: null,
      file: entry.file,
    });
    setRightTab("patch");
    if (entry.file) workspace.openFile(entry.file);
  }, [workspace]);

  // ─── Derived values ───────────────────────────────────────────────────────
  const showDiffEditor = patch.status === "ready" || patch.status === "applied";
  const isPatchStreaming = patch.status === "generating";
  const hasUndo = undoStack.length > 0;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#07090f]">
      {/* Top header bar */}
      <WorkspaceHeader repoPath={repoPath} activeFile={workspace.activeFile} />

      {/* Main 3-pane body */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ─── PANE 1: File Explorer ──────────────────────────────────── */}
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

        {/* ─── PANE 2: Editor (center) ─────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-white/5">
          {/* Editor tab / breadcrumb bar */}
          <div className="flex items-center gap-0 h-9 border-b border-white/5 bg-[#090c14] shrink-0 overflow-x-auto scrollbar-thin">
            {workspace.activeFile ? (
              <div className="flex items-center gap-1.5 px-3 h-full border-r border-white/5 bg-[#0d1117]">
                {/* Diff badge when patch active */}
                {showDiffEditor && (
                  <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded bg-violet-600/20 border border-violet-500/30 text-violet-400 mr-1 uppercase tracking-wider">
                    DIFF
                  </span>
                )}
                <span className="text-[10px] text-gray-400 font-mono truncate max-w-[280px]">
                  {workspace.activeFile.split(/[/\\]/).pop()}
                </span>
                <button
                  onClick={() => {
                    workspace.openFile(null);
                    clearSelection();
                    setPatch(INITIAL_PATCH);
                  }}
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

          {/* Patch toolbar (when diff is active) */}
          {(showDiffEditor || isPatchStreaming) && (
            <PatchToolbar
              status={patch.status}
              instruction={patch.instruction}
              isStreaming={isPatchStreaming}
              hasUndo={hasUndo}
              onApply={handleApplyPatch}
              onReject={handleRejectPatch}
              onCopy={handleCopyPatch}
              onDownload={handleDownloadPatch}
              onUndo={handleUndoPatch}
              onStop={handleStopPatch}
            />
          )}

          {/* Editor or Diff viewer */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {showDiffEditor ? (
              <DiffViewer
                original={patch.originalContent || ""}
                modified={patch.modifiedContent || ""}
                filePath={patch.file || workspace.activeFile}
              />
            ) : (
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
            )}
          </div>

          {/* Bottom resize drag handle */}
          {bottomPanel && (
            <div
              className={`h-1 cursor-row-resize bg-white/5 hover:bg-indigo-500/30 transition-colors shrink-0 ${isDragging ? "bg-indigo-500/40" : ""}`}
              onMouseDown={handleResizeDragStart}
            />
          )}

          {/* Bottom Dock Panel */}
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

        {/* ─── PANE 3: AI Sidebar (Chat / Patch / History) ─────────────── */}
        <div className="w-[360px] xl:w-[400px] shrink-0 flex flex-col overflow-hidden">
          {/* Sub-panel tab strip */}
          <div className="flex items-center border-b border-white/5 bg-[#090c14] shrink-0">
            {RIGHT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRightTab(tab.key)}
                className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all border-b-2 ${
                  rightTab === tab.key
                    ? "border-violet-500 text-violet-400 bg-violet-500/5"
                    : "border-transparent text-gray-600 hover:text-gray-300 hover:bg-white/3"
                }`}
              >
                {tab.label}
                {/* Small dot badge for patch status */}
                {tab.key === "patch" && patch.status !== "idle" && (
                  <span
                    className={`inline-block ml-1.5 w-1.5 h-1.5 rounded-full align-middle ${
                      patch.status === "generating" ? "bg-amber-400 animate-pulse"
                      : patch.status === "ready"    ? "bg-indigo-400"
                      : patch.status === "applied"  ? "bg-emerald-400"
                      : "bg-rose-500"
                    }`}
                  />
                )}
                {tab.key === "history" && patchHistory.length > 0 && (
                  <span className="inline-block ml-1.5 px-1 py-0 text-[8px] bg-white/10 rounded text-gray-500 align-middle">
                    {patchHistory.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {rightTab === "chat" && (
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
            )}

            {rightTab === "agents" && (
              <AgentChat
                repoPath={repoPath}
                activeFile={workspace.activeFile}
                activeSymbol={workspace.activeSymbol}
                selectionText={selectionText}
                selectionRange={selectionRange}
              />
            )}

            {rightTab === "patch" && (
              <PatchViewer
                status={patch.status}
                summary={patch.summary}
                activeFile={workspace.activeFile}
                selectionText={selectionText}
                selectionRange={selectionRange}
                isStreaming={isPatchStreaming}
                onRequestPatch={handleRequestPatch}
              />
            )}

            {rightTab === "history" && (
              <PatchHistory
                history={patchHistory}
                onSelect={handleSelectHistory}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
