interface PatchHistoryEntry {
  id: string | number;
  status: "ready" | "applied" | "rejected";
  timestamp: string | number;
  file?: string;
  instruction: string;
  [key: string]: any;
}

interface PatchHistoryProps {
  history: PatchHistoryEntry[];
  onSelect: (entry: PatchHistoryEntry) => void;
}

export default function PatchHistory({ history, onSelect }: PatchHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-bg border border-border rounded-xl">
        <div className="flex items-center gap-2 px-3 h-9 border-b border-border shrink-0 bg-panel">
          <div className="w-1.5 h-1.5 rounded-full bg-muted" />
          <span className="text-[10px] font-bold text-muted font-mono uppercase tracking-widest">
            Patch History
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted text-[11px] font-mono">
          No patches yet
        </div>
      </div>
    );
  }

  const statusIcon = {
    ready:    { icon: "◈", color: "text-accent" },
    applied:  { icon: "✓", color: "text-success" },
    rejected: { icon: "✕", color: "text-danger" },
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg border border-border rounded-xl">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border shrink-0 bg-panel select-none">
        <div className="w-1.5 h-1.5 rounded-full bg-accent glowing-dot" />
        <span className="text-[10px] font-bold text-text-strong font-mono uppercase tracking-widest">
          Patch History
        </span>
        <span className="ml-auto text-[9px] text-muted font-mono">{history.length} entries</span>
      </div>

      <div className="flex-grow overflow-y-auto scrollbar-thin divide-y divide-border/60">
        {[...history].reverse().map((entry) => {
          const cfg = statusIcon[entry.status] || statusIcon.ready;
          const ts = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const fileName = entry.file ? entry.file.split(/[\\/]/).pop() : "Unknown";
          return (
            <button
              key={entry.id}
              onClick={() => onSelect && onSelect(entry)}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-panel-alt transition-colors group cursor-pointer"
            >
              <span className={`text-[13px] font-mono mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-[10px] text-text font-mono truncate font-semibold group-hover:text-text-strong transition-colors">
                  {entry.instruction}
                </p>
                <p className="text-[9px] text-muted font-mono truncate">
                  {fileName} · {ts}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
