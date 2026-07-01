export default function CommitHistory({
  commits = [],
  selectedCommitSha,
  onSelectCommit,
  onExplainCommit,
  isExplaining,
  explanationText,
}) {
  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs font-mono select-none">
        No commits in history.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#07090f]">
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/4">
        {commits.map((c) => {
          const isSelected = selectedCommitSha === c.hexsha;
          const formattedDate = new Date(c.date).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={c.hexsha}
              onClick={() => onSelectCommit && onSelectCommit(c.hexsha)}
              className={`p-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600/10 border-l-2 border-indigo-500"
                  : "hover:bg-white/3 border-l-2 border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-mono font-bold text-gray-300 truncate max-w-[200px]" title={c.summary}>
                  {c.summary}
                </span>
                <span className="text-[9px] font-mono text-gray-600 shrink-0 select-none">
                  {c.hexsha.substring(0, 7)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono">
                <span>{c.author}</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Commit details & explanation section */}
      {selectedCommitSha && (
        <div className="border-t border-white/5 bg-[#090c14] shrink-0 p-3 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider">
              Selected: {selectedCommitSha.substring(0, 8)}
            </span>
            <button
              onClick={() => onExplainCommit && onExplainCommit(selectedCommitSha)}
              disabled={isExplaining}
              className="px-2 py-1 text-[9px] font-mono font-bold rounded bg-violet-600 border border-violet-500 hover:bg-violet-500 text-white transition-all disabled:opacity-40"
            >
              {isExplaining ? "Explaining..." : "Explain with AI"}
            </button>
          </div>

          {/* AI Explanation result */}
          {explanationText && (
            <div className="text-[10px] text-gray-300 font-mono leading-relaxed bg-[#06080d] border border-white/5 rounded-lg p-2.5 whitespace-pre-wrap select-text selection:bg-indigo-500/30">
              {explanationText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
