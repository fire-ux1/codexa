import { Search, ChevronDown, GitBranch, Maximize2, Minimize2 } from "lucide-react";
import NotificationCenter from "./NotificationCenter";

interface WorkspaceHeaderProps {
  repoPath: string | null | undefined;
  activeFile?: string | null;
  onOpenSearch?: () => void;
  branch?: string | null;
  onBranchClick?: () => void;
  zenMode?: boolean;
  onToggleZen?: () => void;
}

export default function WorkspaceHeader({
  repoPath,
  activeFile,
  onOpenSearch,
  branch,
  onBranchClick,
  zenMode = false,
  onToggleZen,
}: WorkspaceHeaderProps) {
  const repoName = repoPath ? repoPath.split(/[\\/]/).pop() || "" : "No Repository Opened";
  const fileName = activeFile ? activeFile.split(/[\\/]/).pop() || null : null;

  return (
    <div className="flex items-center gap-3 px-3 h-9 bg-bg border-b border-border shrink-0 select-none justify-between z-30 shadow-sm">

      {/* Left side Logo + Repository Selector dropdown */}
      <div className="flex items-center gap-2.5 select-none">
        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-[18px] h-[18px] rounded bg-accent flex items-center justify-center shadow shadow-accent/20">
            <span className="text-bg text-[8.5px] font-black">CW</span>
          </div>
          <span className="text-[10.5px] font-bold text-text-strong font-mono tracking-wider">ChunkWiser</span>
        </div>

        {/* Separator */}
        <span className="text-muted font-mono text-[11px]">/</span>

        {/* Repository selector dropdown */}
        <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-panel hover:bg-panel-alt border border-border text-[10px] text-text font-mono hover:text-text-strong transition-all cursor-pointer">
          <span>{repoName}</span>
          <ChevronDown className="w-3 h-3 text-muted" />
        </button>

        {/* Active file breadcrumb */}
        {fileName && (
          <>
            <span className="text-muted font-mono text-[11px]">›</span>
            <span className="text-[10px] font-mono text-accent bg-accent-dim/10 px-2 py-0.5 rounded border border-accent/15">
              {fileName}
            </span>
          </>
        )}

        {/* Branch pill — clickable, opens the Git activity tab */}
        {branch && (
          <button
            type="button"
            onClick={onBranchClick}
            title={`Branch: ${branch}`}
            className="branch-pill"
          >
            <GitBranch className="w-3 h-3 text-[#FF9D4D]" />
            <span className="truncate max-w-[120px]">{branch}</span>
          </button>
        )}
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1 bg-bg hover:bg-panel border border-border hover:border-accent/20 rounded-xl transition-all text-left text-muted hover:text-text font-sans cursor-pointer shadow-inner"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-muted" />
            <span className="text-[10.5px] truncate">Search files, symbols, commands...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-panel border border-border font-mono text-[9px] text-muted select-none">
             K
          </kbd>
        </button>
      </div>

      {/* Right side: notifications, zen toggle, profile */}
      <div className="flex items-center gap-2.5">
        <NotificationCenter />

        <span className="w-px h-4 bg-border" />

        <button
          type="button"
          onClick={onToggleZen}
          aria-label={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
          aria-pressed={zenMode}
          title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode (Ctrl+Alt+Z)"}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            zenMode
              ? "bg-accent-dim/15 text-accent border border-accent/20"
              : "text-muted hover:text-text-strong hover:bg-panel border border-transparent"
          }`}
        >
          {zenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <span className="w-px h-4 bg-border" />

        {/* Profile Avatar */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-accent to-blue-400 flex items-center justify-center text-bg font-bold text-[9px] border border-border">
          A
        </div>
      </div>

    </div>
  );
}