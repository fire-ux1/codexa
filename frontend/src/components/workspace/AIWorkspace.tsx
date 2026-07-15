import { useState, useCallback, useRef, useEffect, Suspense, lazy } from "react";
import type { Node, Edge } from "@xyflow/react";
import useWorkspace from "../../hooks/useWorkspace";
import { ErrorBoundary } from "../common/ErrorBoundary";
import useSelection from "../../hooks/useSelection";
import useConversation from "../../hooks/useConversation";

// Components & Sidebars
import AdvancedExplorer from "../explorer/AdvancedExplorer";
import WorkspaceHeader from "./WorkspaceHeader";
import SearchTab from "../../tabs/SearchTab";

// Services
import { fetchRepositoryFiles } from "../../services/api";
import type { ArchitectureResponse, RepositoryFileNode } from "../../services/api";
import { runPatchStream, commitPatch } from "../../services/patch";
import { fetchGitStatus, fetchGitDiff } from "../../services/git";

// Components
import ActivityBar from "./ActivityBar";
import StatusBar from "./StatusBar";
import SplitLayout from "../common/SplitLayout";
import CommandPalette from "../common/CommandPalette";
import InteractiveTour from "./InteractiveTour";
import WelcomeDashboard from "./WelcomeDashboard";
import ProjectHealthDashboard from "./ProjectHealthDashboard";
import AnalyticsDashboard from "./AnalyticsDashboard";
import ActivityTimeline from "./ActivityTimeline";
import BottomPanel from "./BottomPanel";
import RepositoryGraph from "./RepositoryGraph";
import AdminDashboard from "./AdminDashboard";

// Lazy-loaded components
const MonacoFileViewer = lazy(() => import("../editor/MonacoFileViewer"));
const DiffViewer = lazy(() => import("../patch/DiffViewer"));
const CallGraphTab = lazy(() => import("../../tabs/CallGraphTab"));
const RepositoryReviewTab = lazy(() => import("../../tabs/RepositoryReviewTab"));
const AISidebar = lazy(() => import("./AISidebar"));

// ─── Types ───────────────────────────────────────────────────────────────
// Everything below reflects only what THIS file directly reads/writes.
// Several imported modules (useConversation, services/git, services/patch,
// and every non-lazy/lazy child component apart from the ones already
// audited) haven't been provided yet, so this file can only be as strict as
// its dependencies — passing a malformed prop into e.g. <AISidebar> won't be
// caught until that component itself is typed. Send those next for full
// end-to-end coverage; what's here is everything I can verify from this
// file's own evidence.

type ActiveActivity = "repository" | "search" | "git" | "history" | "settings";

// CONFIRMED by usage: "editor"/"understand"/"trace"/"review"/"improve" are
// all read/set in this file. "home"/"health"/"analytics"/"admin" are also
// set here (health/analytics/admin via WelcomeDashboard's onExecuteAction);
// "home" appears only in the original inline comment with no matching
// `mode === "home"` check anywhere — likely vestigial, kept for safety.
type WorkspaceMode =
  | "home"
  | "editor"
  | "understand"
  | "trace"
  | "review"
  | "improve"
  | "health"
  | "analytics"
  | "admin";

// INFERRED — only "terminal" is ever set in this file. BottomPanel.tsx
// (not yet provided) may define/consume the other three internally.
type BottomPanelKind = "terminal" | "problems" | "git" | "performance";

type PatchStatus = "idle" | "generating" | "ready" | "applied" | "rejected";

interface PatchState {
  status: PatchStatus;
  instruction: string | null;
  summary: string | null;
  originalContent: string | null;
  modifiedContent: string | null;
  file: string | null;
  diff: string;
}

interface PatchHistoryEntry {
  id: number;
  timestamp: string;
  instruction: string | null;
  file: string | null;
  status: PatchStatus;
  summary: string | null;
  originalContent: string | null;
  modifiedContent: string | null;
}

interface UndoStackEntry {
  file: string;
  content: string | null;
}

// INFERRED — ideally sourced from services/git.ts once available. `unstaged`
// confirmed against AdvancedExplorer.tsx's own (structurally compatible)
// local GitStatus type; `active_branch` confirmed against this file's usage.
interface GitStatusData {
  active_branch: string;
  unstaged?: string[];
}

// FunctionCaller is a function name string (from callGraph object keys).

// SendMessagePayload is used by useConversation — no local interface needed.

// CONFIRMED — the exhaustive if/else chain in handleApplyProfile only ever
// checks these four values, with no default case (unmatched ids no-op).
type WorkspaceProfileId = "backend-api" | "frontend-react" | "code-review" | "full-stack";

// Raw shape of one line of the patch-generation SSE-style stream, before
// runtime validation. Only the "done" event's fields are read here.
interface PatchStreamDoneEvent {
  type: "done";
  summary?: string;
  original?: string;
  updated?: string;
  diff?: string;
}

function isPatchStreamDoneEvent(value: unknown): value is PatchStreamDoneEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).type === "done"
  );
}

const INITIAL_PATCH: PatchState = {
  status: "idle",
  instruction: null,
  summary: null,
  originalContent: null,
  modifiedContent: null,
  file: null,
  diff: "",
};

export interface AIWorkspaceProps {
  repoPath: string | null | undefined;
  repoId: string | number | null | undefined;
  architecture: ArchitectureResponse | null;
  // INFERRED as @xyflow/react types per the documented tech stack — confirm
  // against RepositoryGraph.tsx, which isn't provided yet.
  graphNodes: Node[];
  graphEdges: Edge[];
  selectedNode: string | null;
  isArchitectureLoading: boolean;
  isGraphLoadingReactFlow: boolean;
  onNodeClick: (nodeId: string) => void;
  onGetArchitecture: () => void;
  getFileColor: (extension: string) => string;
  callGraph: Record<string, string[]> | null;
  graphSearch: string;
  setGraphSearch: (value: string) => void;
  selectedFunc: string | null;
  setSelectedFunc: (value: string | null) => void;
  filteredFunctions: string[];
  functionCallers: string[]; // Callers are function name strings from callGraph keys
  isGraphLoading: boolean;
  onGetCallGraph: () => void;
  architectureError: string | null;
  callGraphError: string | null;
  indexingProgress?: any;
}

export default function AIWorkspace({
  repoPath,
  repoId: activeRepoId,
  architecture,
  graphNodes,
  graphEdges,
  selectedNode,
  isArchitectureLoading,
  isGraphLoadingReactFlow,
  onNodeClick,
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
  architectureError,
  callGraphError,
  indexingProgress,
}: AIWorkspaceProps) {
  const workspace = useWorkspace();
  const conversation = useConversation();
  const { selectionText, selectionRange, language, handleSelectionChange } = useSelection(workspace.activeFile);

  // States
  const [activeActivity, setActiveActivity] = useState<ActiveActivity>("repository");
  const [mode, setMode] = useState<WorkspaceMode>("editor");
  const [rightTab, setRightTab] = useState<string>("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const [filesList, setFilesList] = useState<RepositoryFileNode[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);

  // Zen / Focus mode
  const [zenMode, setZenMode] = useState<boolean>(false);
  const preZenSidebarCollapsedRef = useRef<boolean>(sidebarCollapsed);

  // Git states for sidebar + header branch pill
  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [loadingGit, setLoadingGit] = useState<boolean>(false);

  // Live connectivity state — navigator.onLine read once at mount would go
  // stale the moment the connection actually changes, so this tracks the
  // browser's online/offline events instead.
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  // Patch states
  const [patch, setPatch] = useState<PatchState>(INITIAL_PATCH);
  const [patchHistory, setPatchHistory] = useState<PatchHistoryEntry[]>([]);
  const [undoStack, setUndoStack] = useState<UndoStackEntry[]>([]);
  const [isPatchStreaming, setIsPatchStreaming] = useState<boolean>(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Bottom dock panel state for editor mode
  const [bottomPanel, setBottomPanel] = useState<BottomPanelKind | null>(null);
  const [bottomHeight, setBottomHeight] = useState<number>(250);
  const [isDraggingBottom, setIsDraggingBottom] = useState<boolean>(false);

  // Sidebar resize widths
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(200);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState<boolean>(false);
  const [isDraggingRight, setIsDraggingRight] = useState<boolean>(false);

  // Load files list for caching. Guarded with a request id so a slower,
  // stale response (e.g. from rapidly switching repoPath) can't overwrite
  // state from a newer request that already resolved.
  const filesRequestIdRef = useRef<number>(0);
  useEffect(() => {
    if (!repoPath) return;
    const requestId = ++filesRequestIdRef.current;
    setLoadingFiles(true);
    fetchRepositoryFiles(repoPath)
      .then((res) => {
        if (filesRequestIdRef.current !== requestId) return;
        setFilesList(Array.isArray(res) ? res : []);
      })
      .catch((err: unknown) => {
        if (filesRequestIdRef.current === requestId) {
          console.error("Error loading files list:", err);
        }
      })
      .finally(() => {
        if (filesRequestIdRef.current === requestId) {
          setLoadingFiles(false);
        }
      });
  }, [repoPath]);

  // Load Git status. Previously gated behind `activeActivity === "git"`,
  // but nothing in the UI actually sets activeActivity to "git" anymore
  // (the Activity Bar's redesign doesn't expose a Git entry point directly
  // — it's reachable via the header's branch pill instead), which made the
  // whole Git sidebar tab dead/unreachable code. Loading this on repoPath
  // change instead also means the header's branch pill always has real
  // data instead of showing nothing.
  const loadGitStatus = useCallback(async () => {
    if (!repoPath) return;
    setLoadingGit(true);
    try {
      const statusData: GitStatusData = await fetchGitStatus(repoPath);
      setGitStatus(statusData);
    } catch (err: unknown) {
      console.error("Git load error:", err);
    } finally {
      setLoadingGit(false);
    }
  }, [repoPath]);

  useEffect(() => {
    loadGitStatus();
  }, [repoPath, loadGitStatus]);

  // Entry point into the Git activity tab — reachable via the header's
  // branch pill (clickable) now that it isn't gated behind a nav icon.
  const handleOpenGitActivity = useCallback(() => {
    setActiveActivity("git");
    setMode("editor");
  }, []);

  // Zen mode: collapse chrome around the editor. Remembers the sidebar's
  // prior collapsed state so leaving zen mode restores it, rather than
  // always forcing the sidebar back open.
  useEffect(() => {
    if (zenMode) {
      preZenSidebarCollapsedRef.current = sidebarCollapsed;
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(preZenSidebarCollapsedRef.current);
    }
    // Intentionally only reacts to zenMode toggling, not to sidebarCollapsed
    // changes in general (that would fight manual collapse/expand clicks).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zenMode]);

  // Global keybind listeners
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K -> Command Palette
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      // Ctrl+P -> Quick Open File
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
      // Ctrl+Shift+F -> Semantic search panel focus
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setActiveActivity("search");
      }
      // Ctrl+Alt+Z -> Toggle Zen / Focus mode.
      // NOTE: was Ctrl+Shift+Z, which collides with Monaco's built-in redo
      // binding (Ctrl+Shift+Z / Cmd+Shift+Z) — Monaco doesn't stopPropagation
      // on handled commands, so both redo AND zen-toggle would fire together.
      // Ctrl+Alt+Z doesn't collide with Monaco defaults or any binding above.
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setZenMode((prev) => !prev);
      }
      // Alt+Enter -> Focus suggested actions / chat
      if (e.altKey && e.key === "Enter") {
        e.preventDefault();
        setRightTab("chat");
        setSidebarCollapsed(false);
      }
      // Ctrl+S -> Save file content (only if a file is actually open)
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (workspace.activeFile) {
          workspace.saveFile(workspace.activeFile);
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [workspace]);

  // Live connectivity tracking
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleExplorerFileOpen = useCallback(
    (filePath: string) => {
      workspace.openFile(filePath);
      if (filePath) {
        setMode("editor");
      }
    },
    [workspace]
  );

  const handleSelectHistory = (entry: PatchHistoryEntry) => {
    setPatch({
      status: entry.status === "applied" ? "ready" : entry.status,
      instruction: entry.instruction,
      summary: entry.summary,
      originalContent: entry.originalContent,
      modifiedContent: entry.modifiedContent,
      file: entry.file,
      diff: "",
    });
    setMode("improve");
  };

  // Drag handlers for Left/Right panels
  const handleLeftDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLeft(true);
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setLeftSidebarWidth(Math.max(160, Math.min(450, startWidth + delta)));
    };
    const onUp = () => {
      setIsDraggingLeft(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleRightDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingRight(true);
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      setRightSidebarWidth(Math.max(260, Math.min(600, startWidth + delta)));
    };
    const onUp = () => {
      setIsDraggingRight(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleBottomDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingBottom(true);
    const startY = e.clientY;
    const startHeight = bottomHeight;

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setBottomHeight(Math.max(120, Math.min(500, startHeight + delta)));
    };
    const onUp = () => {
      setIsDraggingBottom(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Commands triggered by palette selection
  const handleExecuteCommand = (key: string) => {
    if (key === "architecture") {
      setMode("understand");
    } else if (key === "graph") {
      setMode("trace");
    } else if (key === "review") {
      setMode("review");
    } else if (key === "git") {
      handleOpenGitActivity();
    } else if (key === "chat") {
      setRightTab("chat");
      setSidebarCollapsed(false);
    }
  };

  // Dynamic git diff check
  const handleGitFileClick = async (filePath: string) => {
    try {
      const res = await fetchGitDiff(repoPath ?? "");
      if (res.status === "success") {
        setPatch({
          status: "ready",
          instruction: "Git diff modifications",
          summary: "Local repository changes compared with active branch.",
          originalContent: "",
          modifiedContent: "",
          file: filePath,
          diff: res.diff,
        });
        setMode("improve");
      }
    } catch (e: unknown) {
      console.error(e);
    }
  };

  // Quick actions (Explain / Generate tests / Find bugs / Refactor).
  // Previously wired to ActivityBar's now-removed Quick Actions section;
  // the redesigned ActivityBar doesn't render that UI or call this prop
  // anymore, which made all of this logic unreachable. Kept as a single
  // reusable handler so it's ready to wire into a right-click context
  // menu in the editor (per the design plan) once that menu exists.
  const handleQuickAction = useCallback(
    (actionId: string) => {
      if (actionId === "explain") {
        if (workspace.activeFile) {
          conversation.sendMessage({
            repo: repoPath ?? "",
            file: workspace.activeFile,
            symbol: "",
            selection: "",
            message: `Explain this code`,
          });
        } else {
          conversation.sendMessage({
            repo: repoPath ?? "",
            file: "",
            symbol: "",
            selection: "",
            message: `Explain this repository`,
          });
        }
      } else if (actionId === "generate_tests") {
        conversation.sendMessage({
          repo: repoPath ?? "",
          file: workspace.activeFile || "",
          symbol: "",
          selection: "",
          message: `Generate unit tests`,
        });
      } else if (actionId === "find_bugs") {
        conversation.sendMessage({
          repo: repoPath ?? "",
          file: workspace.activeFile || "",
          symbol: "",
          selection: "",
          message: `Find potential bugs`,
        });
      } else if (actionId === "refactor") {
        conversation.sendMessage({
          repo: repoPath ?? "",
          file: workspace.activeFile || "",
          symbol: "",
          selection: "",
          message: `Refactor this code for better quality`,
        });
      }
      setRightTab("chat");
      setSidebarCollapsed(false);
    },
    [workspace.activeFile, repoPath, conversation]
  );

  // AI patch triggers
  const handleRequestPatch = async (instruction: string) => {
    if (!workspace.activeFile || !workspace.activeFileContent) return;

    // Stay in editor mode if that's where the user already is — the patch
    // now renders as an inline widget anchored to the code (see the
    // MonacoFileViewer `inlinePatch` prop below) instead of forcing a
    // context switch to the separate Improve panel. Any other mode still
    // falls back to Improve, since there's no editor surface to anchor to.
    setMode((prev) => (prev === "editor" ? prev : "improve"));

    const originalContent = workspace.activeFileContent;
    const targetFile = workspace.activeFile;

    setPatch({
      ...INITIAL_PATCH,
      status: "generating",
      instruction,
      file: targetFile,
      originalContent,
    });
    setIsPatchStreaming(true);

    try {
      const controller = new AbortController();
      streamAbortRef.current = controller;

      const resp: Response = await runPatchStream({
        instruction,
        file_path: targetFile,
        content: selectionText || originalContent,
        selection_range: selectionRange || null,
        repo: repoPath ?? undefined,
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) throw new Error("Patch failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneData: PatchStreamDoneEvent | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed: unknown = JSON.parse(trimmed);
            if (isPatchStreamDoneEvent(parsed)) doneData = parsed;
          } catch {
            // ignore partial line JSON parse errors
          }
        }
      }

      if (doneData) {
        const finalData = doneData;
        setPatch((prev) => ({
          ...prev,
          status: "ready",
          summary: finalData.summary || "",
          originalContent: finalData.original || originalContent,
          modifiedContent: finalData.updated || "",
          diff: finalData.diff || "",
        }));
      } else {
        setPatch((prev) => ({ ...prev, status: "rejected", summary: "No modifications proposed." }));
      }
    } catch (err: unknown) {
      console.error("Patch generation error:", err);
      setPatch((prev) => ({ ...prev, status: "rejected", summary: "Generation failed." }));
    } finally {
      setIsPatchStreaming(false);
      streamAbortRef.current = null;
    }
  };

  const handleStopPatch = () => {
    if (streamAbortRef.current) streamAbortRef.current.abort();
  };

  const handleApplyPatch = async () => {
    if (!patch.modifiedContent || !patch.file) return;
    try {
      setUndoStack((prev) => [...prev, { file: patch.file as string, content: patch.originalContent }]);
      await commitPatch(patch.file, patch.modifiedContent);
      await workspace.openFile(patch.file);

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
      setMode("editor");
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleRejectPatch = () => {
    setPatch(INITIAL_PATCH);
    setMode("editor");
  };

  const handleUndoPatch = async () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    if (last.content === null) {
      console.error("Undo entry has no stored content — skipping to avoid writing null to the file.");
      return;
    }
    try {
      await commitPatch(last.file, last.content);
      await workspace.openFile(last.file);
      setUndoStack((prev) => prev.slice(0, -1));
      setPatch(INITIAL_PATCH);
      setMode("editor");
    } catch (err: unknown) {
      console.error(err);
    }
  };

  // Render goal headers for visual splits
  const renderGoalHeader = (title: string) => (
    <div className="h-9 px-3 border-b border-[#1c2230] bg-[#0c0f16] flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[10px] font-bold text-gray-300 font-mono uppercase tracking-wider">{title}</span>
      </div>
      <button
        onClick={() => setMode("editor")}
        className="px-2 py-0.5 rounded border border-[#1c2230] hover:bg-white/5 text-[9px] text-gray-400 hover:text-white transition-colors font-mono"
      >
        ✕ Exit Goal
      </button>
    </div>
  );

  const handleApplyProfile = (profileId: WorkspaceProfileId) => {
    if (profileId === "backend-api") {
      setMode("trace");
      setBottomPanel("terminal");
    } else if (profileId === "frontend-react") {
      setMode("editor");
      setActiveActivity("repository");
    } else if (profileId === "code-review") {
      setMode("review");
    } else if (profileId === "full-stack") {
      setMode("editor");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#090b10] text-[#d1d5db]">
      {/* ── Header (hidden in Zen mode) ── */}
      {!zenMode && (
        <WorkspaceHeader
          repoPath={repoPath}
          activeFile={workspace.activeFile}
          onOpenSearch={() => setIsPaletteOpen(true)}
          branch={gitStatus?.active_branch}
          onBranchClick={handleOpenGitActivity}
          zenMode={zenMode}
          onToggleZen={() => setZenMode((z) => !z)}
        />
      )}

      {/* ── Main Frame ── */}
      <div className="flex flex-grow overflow-hidden min-h-0 relative">
        {/* Leftmost Activity Bar */}
        <ActivityBar
          activeActivity={activeActivity}
          onSelectActivity={(activity) => setActiveActivity(activity as ActiveActivity)}
          activeMode={mode}
          onSelectMode={(m) => setMode(m as WorkspaceMode)}
          rightTab={rightTab}
          onSelectRightTab={setRightTab}
          onToggleRightSidebar={setSidebarCollapsed}
        />

        {/* Left Sidebar (width collapses to 0 in Zen mode) */}
        <div
          style={{ width: `${zenMode ? 0 : leftSidebarWidth}px` }}
          className="shrink-0 bg-[#0f1219] border-r border-[#1c2230] flex flex-col min-h-0 overflow-hidden transition-[width] duration-150"
        >
          {activeActivity === "repository" && (
            <div className="flex flex-col h-full overflow-hidden">
              <AdvancedExplorer
                repoPath={repoPath || ""}
                selectedPath={workspace.activeFile || ""}
                onOpenFile={handleExplorerFileOpen}
                gitStatus={gitStatus}
                onTriggerContextAction={(actionId, path) => {
                  if (actionId === "explain") {
                    conversation.sendMessage({
                      repo: repoPath ?? "",
                      file: path,
                      symbol: "",
                      selection: "",
                      message: `Explain this file`,
                    });
                    setRightTab("chat");
                    setSidebarCollapsed(false);
                  } else if (actionId === "review") {
                    setMode("review");
                    workspace.openFile(path);
                  }
                }}
              />
            </div>
          )}

          {activeActivity === "search" && (
            <SearchTab
              repoPath={repoPath ?? ""}
              filesList={filesList}
              onOpenFile={handleExplorerFileOpen}
              onStartTrace={(sym: string) => {
                setSelectedFunc(sym);
                setMode("trace");
              }}
            />
          )}

          {activeActivity === "git" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 border-b border-[#1c2230] bg-[#0c0f16] flex items-center justify-between shrink-0 select-none">
                <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 font-mono">Git Changes</span>
                <button
                  onClick={loadGitStatus}
                  className="p-1 rounded text-[9px] text-indigo-400 font-mono hover:text-indigo-300"
                >
                  Refresh
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-4 font-mono text-[10px] scrollbar-thin">
                {loadingGit ? (
                  <div className="py-8 text-center text-gray-600 animate-pulse">Checking status...</div>
                ) : (
                  <>
                    <div>
                      <span className="text-[9px] text-gray-600 uppercase font-bold block mb-1">Active Branch</span>
                      <p className="text-gray-300 font-semibold text-[11px] truncate">
                        {gitStatus?.active_branch || "Loading..."}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-600 uppercase font-bold block mb-1">Modified Files</span>
                      <div className="space-y-1">
                        {(gitStatus?.unstaged || []).map((file) => (
                          <button
                            key={file}
                            onClick={() => handleGitFileClick(file)}
                            className="w-full text-left p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-amber-400 transition-colors truncate block"
                          >
                            ✎ {file}
                          </button>
                        ))}
                        {(gitStatus?.unstaged || []).length === 0 && (
                          <p className="text-[9px] text-gray-600 italic">No modified files.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeActivity === "settings" && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 border-b border-[#1c2230] bg-[#0c0f16] shrink-0 select-none">
                <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 font-mono">Settings</span>
              </div>
              <div className="p-3.5 space-y-4 text-xs font-mono select-none">
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-600 uppercase font-bold block">Developer Account</span>
                  <p className="text-gray-300">Sandbox Session</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] text-gray-600 uppercase font-bold block">Model Configuration</span>
                  <p className="text-indigo-400">Gemini 1.5 Pro</p>
                </div>
              </div>
            </div>
          )}

          {activeActivity === "history" && (
            <ActivityTimeline
              recentFiles={workspace.openFiles}
              recentChats={conversation.sessions}
              onOpenFile={handleExplorerFileOpen}
              onLoadChat={conversation.loadSession}
            />
          )}
        </div>

        {/* Left Sidebar drag divider (hidden in Zen mode) */}
        {!zenMode && (
          <div
            onMouseDown={handleLeftDrag}
            className={`w-[3px] h-full cursor-col-resize hover:bg-indigo-500/50 bg-[#1c2230] shrink-0 relative transition-colors ${
              isDraggingLeft ? "bg-indigo-500/40" : ""
            }`}
          />
        )}

        {/* Center Main Workspace */}
        <div className="flex-grow flex flex-col min-w-0 overflow-hidden relative workspace-dot-grid">

          {/* Zen mode exit affordance — the shortcut still works with the
              header hidden, but a small always-visible escape hatch avoids
              trapping anyone who doesn't know it. */}
          {zenMode && (
            <button
              type="button"
              onClick={() => setZenMode(false)}
              title="Exit Zen Mode (Ctrl+Alt+Z)"
              className="absolute top-2 right-2 z-30 px-2 py-1 rounded-md bg-panel/90 border border-border text-[9px] font-mono text-muted hover:text-text-strong transition-colors backdrop-blur-sm"
            >
              Exit Zen
            </button>
          )}

          {mode === "health" && (
            <ProjectHealthDashboard
              repoPath={repoPath}
              onBack={() => setMode("editor")}
            />
          )}

          {mode === "analytics" && (
            <AnalyticsDashboard
              onBack={() => setMode("editor")}
            />
          )}

          {mode === "admin" && (
            <ErrorBoundary>
              <AdminDashboard
                repoPath={repoPath ?? ""}
                repoId={activeRepoId ?? null}
                onBack={() => setMode("editor")}
              />
            </ErrorBoundary>
          )}

          {mode === "editor" && (
            <div className="flex-grow flex flex-col min-h-0 overflow-hidden relative">
              {/* Tab Header */}
              <div className="flex items-center gap-0 h-9 border-b border-[#1c2230] bg-[#0c0f16] shrink-0 overflow-x-auto scrollbar-none select-none">
                {workspace.openFiles.map((filePath) => {
                  const isActive = workspace.activeFile === filePath;
                  const isDirty = workspace.dirtyFiles.has(filePath);
                  const fileName = filePath.split(/[/\\]/).pop();

                  return (
                    <div
                      key={filePath}
                      onClick={() => handleExplorerFileOpen(filePath)}
                      title={filePath}
                      className={`group flex items-center gap-2 px-3 h-full border-r border-[#1c2230] transition-all cursor-pointer select-none text-[10px] font-mono ${
                        isActive
                          ? "bg-[#0f1219] text-gray-200 border-t-2 border-t-indigo-500 font-semibold"
                          : "bg-[#0c0f16] text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"
                      }`}
                    >
                      <span>{fileName}</span>
                      <div className="flex items-center justify-center w-4 h-4 rounded hover:bg-white/10 transition-colors">
                        {isDirty ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              workspace.closeFile(filePath);
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:hidden"
                          />
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            workspace.closeFile(filePath);
                          }}
                          className={`text-[9px] text-gray-600 hover:text-gray-300 ${isDirty ? "hidden group-hover:block" : "block"}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}

                {workspace.openFiles.length === 0 && (
                  <span className="px-3 text-[10px] text-gray-700 font-mono italic">No files open</span>
                )}

                {/* Dock launcher */}
                <div className="ml-auto flex items-center px-2 gap-1.5">
                  <button
                    onClick={() => {
                      if (bottomPanel) {
                        setBottomPanel(null);
                      } else {
                        setBottomPanel("terminal");
                      }
                    }}
                    className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold transition-all ${
                      bottomPanel
                        ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20"
                        : "bg-[#0c0f16] text-gray-500 border-[#1c2230] hover:text-gray-300"
                    }`}
                  >
                    Analysis Panel
                  </button>
                </div>
              </div>

              {/* Monaco Viewer */}
              <div className="flex-grow flex-1 min-h-0 relative flex flex-col">
                {workspace.activeFile ? (
                  <ErrorBoundary>
                    <Suspense fallback={<div>Loading editor...</div>}>
                      <MonacoFileViewer
                        filePath={workspace.activeFile}
                        content={workspace.activeFileContent}
                        loading={workspace.isFileLoading}
                        editorRef={workspace.editorRef}
                        repoPath={repoPath}
                        onSelectionChange={handleSelectionChange}
                        onChange={(val: string) => workspace.updateFileContent(workspace.activeFile as string, val)}
                        onReload={() => workspace.openFile(workspace.activeFile as string)}
                        onExplainSymbol={(sym: string) => {
                          workspace.setActiveSymbol(sym);
                          conversation.sendMessage({
                            repo: repoPath ?? "",
                            file: workspace.activeFile as string,
                            symbol: sym,
                            selection: "",
                            message: `/explain ${sym}`,
                          });
                        }}
                        onQuickAction={handleQuickAction}
                        // Inline diff review: when a patch is in flight or
                        // ready for this file, it renders as a widget
                        // anchored to the code instead of forcing a switch
                        // to the separate Improve panel.
                        inlinePatch={
                          patch.file === workspace.activeFile &&
                          (patch.status === "generating" || patch.status === "ready")
                            ? patch
                            : null
                        }
                        onPatchAccepted={handleApplyPatch}
                        onPatchRejected={handleRejectPatch}
                      />
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary>
                    <WelcomeDashboard
                      repoPath={repoPath ?? ""}
                      filesCount={filesList.length}
                      symbolsCount={filesList.length * 8 || 0}
                      onExecuteAction={(actionId: string) => {
                        if (actionId === "explain_repo") {
                          conversation.sendMessage({
                            repo: repoPath ?? "",
                            file: "",
                            symbol: "",
                            selection: "",
                            message: `Explain this repository`,
                          });
                          setRightTab("chat");
                          setSidebarCollapsed(false);
                        } else if (actionId === "architecture") {
                          setMode("understand");
                        } else if (actionId === "search_repo") {
                          setActiveActivity("search");
                          setMode("editor");
                        } else if (actionId === "find_bugs") {
                          conversation.sendMessage({
                            repo: repoPath ?? "",
                            file: workspace.activeFile || "",
                            symbol: "",
                            selection: "",
                            message: `Find potential bugs`,
                          });
                          setRightTab("chat");
                          setSidebarCollapsed(false);
                        } else if (actionId === "generate_tests") {
                          conversation.sendMessage({
                            repo: repoPath ?? "",
                            file: workspace.activeFile || "",
                            symbol: "",
                            selection: "",
                            message: `Generate unit tests`,
                          });
                          setRightTab("chat");
                          setSidebarCollapsed(false);
                        } else if (actionId === "review") {
                          setMode("review");
                        } else if (actionId === "ask_ai") {
                          setRightTab("chat");
                          setSidebarCollapsed(false);
                        } else if (actionId === "health") {
                          setMode("health");
                        } else if (actionId === "analytics") {
                          setMode("analytics");
                        } else if (actionId === "admin") {
                          setMode("admin");
                        }
                      }}
                      recentFiles={workspace.openFiles}
                      onOpenFile={handleExplorerFileOpen}
                      recentChats={conversation.sessions}
                      onLoadChat={conversation.loadSession}
                    />
                  </ErrorBoundary>
                )}
              </div>

              {/* Bottom Dock */}
              {bottomPanel && (
                <>
                  <div
                    className={`h-1 cursor-row-resize bg-[#1c2230] hover:bg-indigo-500/30 transition-colors shrink-0 ${
                      isDraggingBottom ? "bg-indigo-500/40" : ""
                    }`}
                    onMouseDown={handleBottomDrag}
                  />
                  <BottomPanel
                    repoPath={repoPath ?? ""}
                    filesList={filesList.map((f) => f.path)}
                    activeTab={bottomPanel}
                    onClose={() => setBottomPanel(null)}
                  />
                </>
              )}
            </div>
          )}

          {mode === "understand" && (
            <div className="flex flex-col h-full bg-[#0f1219]">
              {renderGoalHeader("Goal: Understand Repository Graph")}
              <div className="flex-grow flex-1 overflow-y-auto p-4 select-text">
                <ErrorBoundary>
                  <RepositoryGraph
                    architecture={architecture}
                    graphNodes={graphNodes}
                    graphEdges={graphEdges}
                    selectedNode={selectedNode}
                    isArchitectureLoading={isArchitectureLoading}
                    isGraphLoadingReactFlow={isGraphLoadingReactFlow}
                    onNodeClick={(_event: any, node: any) => onNodeClick(String(node?.id ?? ""))}
                    onExplainFile={(nodeId: string) => {
                      conversation.sendMessage({
                        repo: repoPath ?? "",
                        file: nodeId,
                        symbol: "",
                        selection: "",
                        message: `Explain this module node`,
                      });
                      setRightTab("chat");
                      setSidebarCollapsed(false);
                    }}
                    onOpenFile={handleExplorerFileOpen}
                    onGetArchitecture={onGetArchitecture}
                    getFileColor={getFileColor}
                    error={architectureError}
                  />
                </ErrorBoundary>
              </div>
            </div>
          )}

          {mode === "trace" && (
            <div className="flex flex-col h-full bg-[#0f1219]">
              {renderGoalHeader("Goal: Trace API Usage")}
              <SplitLayout
                storageKey="trace"
                defaultSplit={40}
                left={
                  <div className="h-full p-4 bg-[#090b10]">
                    <ErrorBoundary>
                      <Suspense fallback={<div>Loading call graph...</div>}>
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
                          error={callGraphError}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                }
                right={
                  <div className="h-full bg-[#0f1219] flex flex-col">
                    <div className="p-3 border-b border-[#1c2230] bg-[#0c0f16]">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 font-mono">
                        Monaco Code Previewer
                      </span>
                    </div>
                    <div className="flex-grow flex-1 min-h-0 relative">
                      {workspace.activeFile ? (
                        <ErrorBoundary>
                          <Suspense fallback={<div>Loading preview...</div>}>
                            <MonacoFileViewer
                              filePath={workspace.activeFile}
                              content={workspace.activeFileContent}
                              loading={workspace.isFileLoading}
                              onReload={() => workspace.openFile(workspace.activeFile as string)}
                            />
                          </Suspense>
                        </ErrorBoundary>
                      ) : (
                        <div className="p-8 text-center text-xs text-gray-500 font-mono italic">
                          No file active. Select a call site reference inside the graph caller list to preview it here.
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
            </div>
          )}

          {mode === "review" && (
            <div className="flex flex-col h-full bg-[#0f1219]">
              {renderGoalHeader("Goal: Review File")}
              <SplitLayout
                storageKey="review"
                defaultSplit={60}
                left={
                  <div className="h-full bg-[#090b10] flex flex-col">
                    <div className="p-3 border-b border-[#1c2230] bg-[#0c0f16]">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 font-mono">
                        File: {workspace.activeFile ? workspace.activeFile.split(/[/\\]/).pop() : "None"}
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                      {workspace.activeFile ? (
                        <ErrorBoundary>
                          <Suspense fallback={<div>Loading editor...</div>}>
                            <MonacoFileViewer
                              filePath={workspace.activeFile}
                              content={workspace.activeFileContent}
                              loading={workspace.isFileLoading}
                              editorRef={workspace.editorRef}
                              repoPath={repoPath}
                              onSelectionChange={handleSelectionChange}
                              onChange={(val: string) => workspace.updateFileContent(workspace.activeFile as string, val)}
                              onReload={() => workspace.openFile(workspace.activeFile as string)}
                            />
                          </Suspense>
                        </ErrorBoundary>
                      ) : (
                        <div className="p-8 text-center text-xs text-gray-500 font-mono italic">
                          Open a file to start AI code reviews.
                        </div>
                      )}
                    </div>
                  </div>
                }
                right={
                  <div className="h-full bg-[#0f1219] p-4 overflow-y-auto">
                    <ErrorBoundary>
                      <Suspense fallback={<div>Loading reviews...</div>}>
                        <RepositoryReviewTab repoPath={repoPath ?? ""} />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                }
              />
            </div>
          )}

          {mode === "improve" && (
            <div className="flex flex-col h-full bg-[#0f1219]">
              {renderGoalHeader("Goal: Improve Code")}
              <SplitLayout
                storageKey="improve"
                defaultSplit={65}
                left={
                  <div className="h-full bg-[#090b10] flex flex-col select-text">
                    <div className="p-3 border-b border-[#1c2230] bg-[#0c0f16]">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 font-mono">
                        Original vs Proposed Code Differences
                      </span>
                    </div>
                    <div className="flex-grow flex-1 min-h-0 relative">
                      <ErrorBoundary>
                        <Suspense fallback={<div>Loading Diff Viewer...</div>}>
                          <DiffViewer
                            original={patch.originalContent || ""}
                            modified={patch.modifiedContent || ""}
                            filePath={patch.file || workspace.activeFile}
                          />
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                  </div>
                }
                right={
                  <div className="h-full bg-[#0f1219] p-4 flex flex-col select-text">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-[#1c2230] pb-2">
                      Proposed Improvements
                    </h3>
                    <div className="flex-grow overflow-y-auto py-3 space-y-3.5 text-xs text-gray-300 font-sans leading-relaxed">
                      <div>
                        <span className="text-[9px] text-gray-600 uppercase font-mono font-bold block mb-1">
                          Instruction
                        </span>
                        <p className="p-2 bg-[#090b10] border border-[#1c2230] rounded-lg text-white font-mono text-[10px] break-all">
                          {patch.instruction || "Refactoring Code Selection"}
                        </p>
                      </div>
                      {patch.summary && (
                        <div>
                          <span className="text-[9px] text-gray-600 uppercase font-mono font-bold block mb-1">
                            Review Summary
                          </span>
                          <p className="bg-[#141822] p-3 border border-[#1c2230] rounded-lg font-sans text-gray-300">
                            {patch.summary}
                          </p>
                        </div>
                      )}
                      {isPatchStreaming && (
                        <div className="py-6 flex flex-col items-center justify-center gap-2 text-indigo-400 animate-pulse font-mono text-[10px]">
                          <span className="w-4 h-4 border border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
                          <span>Streaming patch diffs...</span>
                        </div>
                      )}
                    </div>

                    {/* Actions panel */}
                    <div className="border-t border-[#1c2230] pt-3 space-y-2 select-none shrink-0">
                      {isPatchStreaming && (
                        <button
                          onClick={handleStopPatch}
                          className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider transition-colors mb-2"
                        >
                          Stop Generation
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleApplyPatch}
                          disabled={isPatchStreaming || patch.status !== "ready"}
                          className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/40 text-white font-bold text-[10px] uppercase tracking-wider transition-colors shadow shadow-emerald-600/10"
                        >
                          Apply to File
                        </button>
                        <button
                          onClick={handleRejectPatch}
                          disabled={isPatchStreaming}
                          className="py-2 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/20 text-rose-400 font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          Discard Diff
                        </button>
                      </div>
                      {undoStack.length > 0 && (
                        <button
                          onClick={handleUndoPatch}
                          className="w-full py-1.5 rounded-lg border border-[#1c2230] hover:bg-white/5 text-[9px] text-gray-400 font-mono transition-colors"
                        >
                          Undo last apply
                        </button>
                      )}
                    </div>
                  </div>
                }
              />
            </div>
          )}
        </div>

        {/* Right Sidebar drag divider */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={handleRightDrag}
            className={`w-[3px] h-full cursor-col-resize hover:bg-indigo-500/50 bg-[#1c2230] shrink-0 relative transition-colors ${
              isDraggingRight ? "bg-indigo-500/40" : ""
            }`}
          />
        )}

        {/* Permanently Visible Assistant Sidebar */}
        <ErrorBoundary>
          <Suspense fallback={<div>Loading Assistant...</div>}>
            <AISidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={setSidebarCollapsed}
              activeTab={rightTab}
              setActiveTab={setRightTab}
              width={rightSidebarWidth}
              repoPath={repoPath ?? ""}
              activeFile={workspace.activeFile ?? ""}
              activeSymbol={workspace.activeSymbol ?? ""}
              selectionText={selectionText}
              selectionRange={selectionRange ?? undefined}
              language={language}
              conversationId={conversation.conversationId}
              messages={conversation.messages}
              isStreaming={conversation.isStreaming}
              onSendMessage={conversation.sendMessage}
              onStop={conversation.stopStreaming}
              onNewConversation={conversation.startNewConversation}
              sessions={conversation.sessions}
              onLoadSession={conversation.loadSession}
              patch={patch}
              patchHistory={patchHistory}
              handleRequestPatch={handleRequestPatch}
              handleSelectHistory={handleSelectHistory}
              isPatchStreaming={isPatchStreaming}
              onOpenFile={handleExplorerFileOpen}
              onApplyProfile={handleApplyProfile}
              repoId={activeRepoId !== null && activeRepoId !== undefined ? String(activeRepoId) : undefined}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Persistent Status Bar — stays visible in Zen mode */}
      <StatusBar
        gitStatus={gitStatus ?? undefined}
        filesCount={filesList.length}
        symbolsCount={filesList.length * 8 || 0}
        activeModel="Gemini 1.5 Pro"
        isTaskActive={loadingFiles}
        isOffline={isOffline}
        encoding="UTF-8"
        language={workspace.activeFile ? (workspace.activeFile.split(".").pop() || "Plain Text").toUpperCase() : "Plain Text"}
        cursorLine={selectionRange?.startLine || 1}
        cursorCol={selectionRange?.startColumn || 1}
        indexingProgress={indexingProgress}
      />

      {/* Command Palette Overlay */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        repoPath={repoPath}
        onOpenFile={(f: string) => {
          handleExplorerFileOpen(f);
          setMode("editor");
        }}
        onExecuteCommand={handleExecuteCommand}
      />

      {/* Interactive Tour */}
      <InteractiveTour />
    </div>
  );
}