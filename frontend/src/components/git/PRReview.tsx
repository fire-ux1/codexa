export interface PRCodeIssue {
  category: string;
  file: string;
  description: string;
  severity: string;
}

export interface PRReviewData {
  summary: string;
  quality_score: number;
  recommendations: string[];
  issues: PRCodeIssue[];
  release_notes: string;
}

interface PRReviewProps {
  reviewData: PRReviewData | null | undefined;
  isLoading: boolean;
}

export default function PRReview({ reviewData, isLoading }: PRReviewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2.5 select-none bg-bg">
        <span className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin shrink-0" />
        <span className="text-[10px] text-accent font-mono tracking-widest uppercase animate-pulse">
          Reviewing Pull Request...
        </span>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-xs font-mono select-none bg-bg">
        Run PR review to see AI Specialist report.
      </div>
    );
  }

  const {
    summary = "No summary provided.",
    quality_score = 100,
    recommendations = [],
    issues = [],
    release_notes = "No release notes.",
  } = reviewData;

  // Determine quality color
  const scoreColor =
    quality_score >= 80
      ? "text-success border-success/30 bg-success-bg/10"
      : quality_score >= 50
      ? "text-accent border-accent/30 bg-accent-dim/10"
      : "text-danger border-danger/30 bg-danger-bg/10";

  const getSeverityBadge = (sev: string) => {
    const s = String(sev).toLowerCase();
    if (s === "high") {
      return "bg-danger-bg text-danger border-danger/25";
    }
    if (s === "medium") {
      return "bg-accent-dim/10 text-accent border-accent/25";
    }
    return "bg-panel-alt-2 text-muted border-border";
  };

  const getCategoryIcon = (cat: string) => {
    const c = String(cat).toLowerCase();
    if (c.includes("security")) return "🛡️";
    if (c.includes("performance")) return "⚡";
    if (c.includes("breaking")) return "⚠️";
    return "💡";
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-bg overflow-y-auto scrollbar-thin p-4 space-y-4 select-text">
      
      {/* Overview Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-panel border border-border rounded-xl p-4 shadow-sm">
        {/* Score Ring */}
        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 shrink-0 ${scoreColor}`}>
          <span className="text-xl font-bold font-mono leading-none">{quality_score}%</span>
          <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-muted mt-1 select-none">Score</span>
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="text-[11px] font-mono font-bold text-muted uppercase tracking-widest select-none">PR Review Summary</h4>
          <p className="text-[11px] text-text leading-relaxed font-body">{summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommendations */}
        <div className="bg-panel border border-border rounded-xl p-4 flex flex-col space-y-2 shadow-sm">
          <h4 className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest select-none">AI Recommendations</h4>
          {recommendations.length === 0 ? (
            <p className="text-[10px] text-muted italic font-mono">No specific actions needed.</p>
          ) : (
            <ul className="space-y-1.5 list-disc pl-3">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-[11px] text-text leading-relaxed font-body">
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Release Notes */}
        <div className="bg-panel border border-border rounded-xl p-4 flex flex-col space-y-2 shadow-sm">
          <h4 className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest select-none">Release Changelog</h4>
          <p className="text-[11px] text-text leading-relaxed font-body whitespace-pre-wrap">{release_notes}</p>
        </div>
      </div>

      {/* Code Issues Checklist */}
      <div className="bg-panel border border-border rounded-xl p-4 flex flex-col space-y-2 shadow-sm">
        <h4 className="text-[10px] font-mono font-bold text-muted uppercase tracking-widest select-none">
          Issues Checklist ({issues.length})
        </h4>
        {issues.length === 0 ? (
          <p className="text-[10px] text-success font-mono">✓ No severe code smells, bugs, or risks found.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
            {issues.map((iss, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 p-3 bg-panel-alt border border-border rounded-lg text-left shadow-inner"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-text-strong">
                      {getCategoryIcon(iss.category)} {iss.category}
                    </span>
                    <span className="text-[9px] text-muted font-mono truncate max-w-[200px]" title={iss.file}>
                      · {iss.file}
                    </span>
                  </div>
                  <p className="text-[10px] text-text leading-relaxed font-body">
                    {iss.description}
                  </p>
                </div>
                <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded border uppercase shrink-0 ${getSeverityBadge(iss.severity)}`}>
                  {iss.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
