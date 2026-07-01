export default function PatchHistory({ history, onSelect }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 px-3 h-9 border-b border-white/5 shrink-0 bg-[#090c14]">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-widest">
            Patch History
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-700 text-[11px] font-mono">
          No patches yet
        </div>
      </div>
    );
  }

  const statusIcon = {
    ready:    { icon: "◈", color: "text-indigo-400" },
    applied:  { icon: "✓", color: "text-emerald-400" },
    rejected: { icon: "✕", color: "text-rose-400" },
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/5 shrink-0 bg-[#090c14]">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-widest">
          Patch History
        </span>
        <span className="ml-auto text-[9px] text-gray-600 font-mono">{history.length} entries</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/4">
        {[...history].reverse().map((entry) => {
          const cfg = statusIcon[entry.status] || statusIcon.ready;
          const ts = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const fileName = entry.file ? entry.file.split(/[\\/]/).pop() : "Unknown";
          return (
            <button
              key={entry.id}
              onClick={() => onSelect && onSelect(entry)}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-white/3 transition-all group"
            >
              <span className={`text-[13px] font-mono mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-[10px] text-gray-300 font-mono truncate font-semibold group-hover:text-white transition-colors">
                  {entry.instruction}
                </p>
                <p className="text-[9px] text-gray-600 font-mono truncate">
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
