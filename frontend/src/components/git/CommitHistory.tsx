export interface GitCommitItem {
  hexsha: string;
  summary: string;
  date: string;
  author: string;
  [key: string]: any;
}

interface CommitHistoryProps {
  commits: GitCommitItem[];
  selectedCommitSha: string | null;
  onSelectCommit: (sha: string) => void;
  onExplainCommit?: (sha: string) => void;
  isExplaining?: boolean;
  explanationText?: string;
}

export default function CommitHistory({
  commits = [],
  selectedCommitSha,
  onSelectCommit,
  onExplainCommit,
  isExplaining = false,
  explanationText = "",
}: CommitHistoryProps) {
  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted text-xs font-mono select-none">
        No commits in history.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-bg">
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border/50">
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
                  ? "bg-accent/10 border-l-2 border-accent"
                  : "hover:bg-panel border-l-2 border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-mono font-bold text-text-strong truncate max-w-[200px]" title={c.summary}>
                  {c.summary}
                </span>
                <span className="text-[9px] font-mono text-muted shrink-0 select-none">
                  {c.hexsha.substring(0, 7)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-muted font-mono">
                <span>{c.author}</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Commit details & explanation section */}
      {selectedCommitSha && (
        <div className="border-t border-border bg-panel shrink-0 p-3 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-mono font-bold text-muted uppercase tracking-wider select-none">
              Selected: {selectedCommitSha.substring(0, 8)}
            </span>
            <button
              onClick={() => onExplainCommit && onExplainCommit(selectedCommitSha)}
              disabled={isExplaining}
              className="px-2 py-1 text-[9px] font-mono font-bold rounded bg-accent text-bg hover:bg-accent-strong transition-all disabled:opacity-40 cursor-pointer"
            >
              {isExplaining ? "Explaining..." : "Explain with AI"}
            </button>
          </div>

          {/* AI Explanation result */}
          {explanationText && (
            <div className="text-[10px] text-text font-mono leading-relaxed bg-bg border border-border rounded-lg p-2.5 whitespace-pre-wrap select-text selection:bg-accent/30 shadow-inner">
              {explanationText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
