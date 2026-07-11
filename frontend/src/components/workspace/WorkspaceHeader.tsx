import { Search, ChevronDown, CheckCircle } from "lucide-react";
import NotificationCenter from "./NotificationCenter";

interface WorkspaceHeaderProps {
  repoPath: string | null | undefined;
  activeFile?: string | null;
  onOpenSearch?: () => void;
  indexingProgress?: number;
  isIndexing?: boolean;
}

export default function WorkspaceHeader({
  repoPath,
  activeFile,
  onOpenSearch,
  indexingProgress = 85,
  isIndexing = false,
}: WorkspaceHeaderProps) {
  const repoName = repoPath ? repoPath.split(/[\\/]/).pop() || "" : "No Repository Opened";
  const fileName = activeFile ? activeFile.split(/[\\/]/).pop() || null : null;

  return (
    <div className="flex items-center gap-3 px-4 h-11 bg-bg border-b border-border shrink-0 select-none justify-between z-30 shadow-sm">
      
      {/* Left side Logo + Repository Selector dropdown */}
      <div className="flex items-center gap-3 select-none">
        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-5 h-5 rounded bg-accent flex items-center justify-center shadow shadow-accent/20">
            <span className="text-bg text-[9px] font-black">CP</span>
          </div>
          <span className="text-[11px] font-bold text-text-strong font-mono tracking-wider">CodePilot AI</span>
        </div>

        {/* Separator */}
        <span className="text-muted font-mono text-xs">/</span>

        {/* Repository selector dropdown */}
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-panel hover:bg-panel-alt border border-border text-[10px] text-text font-mono hover:text-text-strong transition-all cursor-pointer">
          <span>{repoName}</span>
          <ChevronDown className="w-3 h-3 text-muted" />
        </button>

        {/* Active file breadcrumb */}
        {fileName && (
          <>
            <span className="text-muted font-mono text-xs">›</span>
            <span className="text-[10px] font-mono text-accent bg-accent-dim/10 px-2 py-0.5 rounded border border-accent/15">
              {fileName}
            </span>
          </>
        )}
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 bg-bg hover:bg-panel border border-border hover:border-accent/20 rounded-xl transition-all text-left text-muted hover:text-text font-sans cursor-pointer shadow-inner"
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

      {/* Right side Indexing Status & Profile */}
      <div className="flex items-center gap-3">
        {isIndexing ? (
          <div className="flex items-center gap-2 bg-accent-dim/10 border border-accent/15 px-3 py-1 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <span className="text-[9px] font-mono font-bold text-accent uppercase tracking-wider">
              Indexing {indexingProgress}%
            </span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 text-success font-bold font-mono text-[9px] uppercase tracking-wider bg-success-bg/10 border border-success/15 px-2.5 py-1 rounded-xl">
            <CheckCircle className="w-3 h-3" />
            <span>Connected</span>
          </div>
        )}

        <span className="w-px h-4 bg-border" />

        {/* Notifications center */}
        <NotificationCenter />

        <span className="w-px h-4 bg-border" />

        {/* Profile Avatar */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-accent to-blue-400 flex items-center justify-center text-bg font-bold text-[9px] border border-border">
          A
        </div>
      </div>

    </div>
  );
}

