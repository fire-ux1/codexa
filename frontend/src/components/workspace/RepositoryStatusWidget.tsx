import { Database, ShieldCheck, AlertTriangle } from "lucide-react";

interface RepositoryStatusWidgetProps {
  filesCount?: number;
  symbolsCount?: number;
  dependencyNodes?: number;
  circularImportsCount?: number;
  lastIndexing?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function RepositoryStatusWidget({
  filesCount = 0,
  symbolsCount = 0,
  dependencyNodes = 0,
  circularImportsCount = 0,
  lastIndexing = "Just now",
  isOpen,
  onToggle,
}: RepositoryStatusWidgetProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all cursor-pointer font-medium text-[11px] font-sans ${
          isOpen ? "bg-accent-dim/15 text-accent border border-accent/20" : "hover:bg-panel-alt text-muted hover:text-text-strong"
        }`}
      >
        <Database className="w-3.5 h-3.5 text-muted shrink-0" />
        <span>Repo Index</span>
        <span className="text-success font-bold text-[11px] select-none">✓</span>
        <span className="text-[10px] bg-bg text-muted px-1.5 py-0.2 rounded border border-border">{filesCount}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-6 right-16 w-60 bg-panel-alt-2 border border-border rounded-xl shadow-2xl p-3.5 z-50 animate-fade-in font-sans text-[11px] space-y-3 select-none text-left">
          <div className="border-b border-border pb-2 flex justify-between items-center">
            <span className="text-muted font-semibold uppercase tracking-wider text-[9px]">Repository Index Database</span>
            <span className="text-[9px] bg-bg text-muted px-1.5 py-0.5 rounded border border-border font-bold">LDB</span>
          </div>

          <div className="space-y-1.5 text-muted">
            <div className="flex justify-between">
              <span>Indexed Files:</span>
              <span className="text-text-strong font-semibold font-mono text-[10px]">{filesCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Indexed Symbols:</span>
              <span className="text-text-strong font-semibold font-mono text-[10px]">{symbolsCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Dependency Edges:</span>
              <span className="text-text-strong font-semibold font-mono text-[10px]">{dependencyNodes.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Circular Imports:</span>
              <span className={circularImportsCount > 0 ? "text-orange-400 font-semibold font-mono text-[10px]" : "text-success font-semibold font-mono text-[10px]"}>
                {circularImportsCount} detected
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 mt-1">
              <span>Last Workspace Scan:</span>
              <span className="text-text font-semibold">{lastIndexing}</span>
            </div>
          </div>

          {circularImportsCount > 0 ? (
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] flex gap-1.5 items-start">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Circular Dependencies</span>
                <p className="text-muted mt-0.5 leading-normal">Check 'Analytics' dashboard for circular import diagnostic resolutions.</p>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-success-bg/10 border border-success/20 text-success text-[10px] flex gap-1.5 items-center">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">Index Integrity Verified</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
