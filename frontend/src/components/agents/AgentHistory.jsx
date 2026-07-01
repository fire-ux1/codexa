export default function AgentHistory({ history = [], onSelect }) {
  if (history.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-700 text-[10px] font-mono select-none">
        No agent reports generated yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#07090f]">
      {/* Title */}
      <div className="flex items-center gap-2 px-3 h-8 border-b border-white/5 shrink-0 bg-[#090c14] select-none">
        <span className="text-[9px] font-bold text-gray-500 font-mono uppercase tracking-widest">
          Reports History ({history.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/4">
        {[...history].reverse().map((entry) => {
          const formattedDate = new Date(entry.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <button
              key={entry.id}
              onClick={() => onSelect && onSelect(entry)}
              className="w-full flex flex-col gap-1 px-3 py-2.5 text-left hover:bg-white/3 transition-all select-none group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-300 font-mono font-bold truncate group-hover:text-white transition-colors">
                  {entry.message}
                </span>
                <span className="text-[8px] text-gray-600 font-mono shrink-0">
                  {formattedDate}
                </span>
              </div>
              <div className="flex items-center justify-between text-[8px] text-gray-500 font-mono">
                <span className="capitalize">{entry.agent_type} Agent</span>
                {entry.collaborate && <span className="text-violet-400">Collaboration</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
