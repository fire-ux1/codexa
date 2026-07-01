export default function PRReview({ reviewData, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2.5 select-none bg-[#07090f]">
        <span className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shrink-0" />
        <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase animate-pulse">
          Reviewing Pull Request...
        </span>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono select-none bg-[#07090f]">
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
      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
      : quality_score >= 50
      ? "text-amber-400 border-amber-500/20 bg-amber-500/5"
      : "text-rose-400 border-rose-500/20 bg-rose-500/5";

  const getSeverityBadge = (sev) => {
    const s = String(sev).toLowerCase();
    if (s === "high") {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (s === "medium") {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-gray-500/10 text-gray-400 border-white/5";
  };

  const getCategoryIcon = (cat) => {
    const c = String(cat).toLowerCase();
    if (c.includes("security")) return "🛡️";
    if (c.includes("performance")) return "⚡";
    if (c.includes("breaking")) return "⚠️";
    return "💡";
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#07090f] overflow-y-auto scrollbar-thin p-4 space-y-4 select-text">
      {/* Overview Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/3 border border-white/5 rounded-xl p-4">
        {/* Score Ring */}
        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 shrink-0 ${scoreColor}`}>
          <span className="text-xl font-bold font-mono leading-none">{quality_score}%</span>
          <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-gray-500 mt-1">Score</span>
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-widest">PR Review Summary</h4>
          <p className="text-[11px] text-gray-300 leading-relaxed">{summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommendations */}
        <div className="bg-white/3 border border-white/5 rounded-xl p-4 flex flex-col space-y-2">
          <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">AI Recommendations</h4>
          {recommendations.length === 0 ? (
            <p className="text-[10px] text-gray-500 italic font-mono">No specific actions needed.</p>
          ) : (
            <ul className="space-y-1.5 list-disc pl-3">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-[11px] text-gray-300 leading-relaxed">
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Release Notes */}
        <div className="bg-white/3 border border-white/5 rounded-xl p-4 flex flex-col space-y-2">
          <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Release Changelog</h4>
          <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">{release_notes}</p>
        </div>
      </div>

      {/* Code Issues Checklist */}
      <div className="bg-white/3 border border-white/5 rounded-xl p-4 flex flex-col space-y-2">
        <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Issues Checklist ({issues.length})</h4>
        {issues.length === 0 ? (
          <p className="text-[10px] text-emerald-400 font-mono">✓ No severe code smells, bugs, or risks found.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
            {issues.map((iss, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 p-2.5 bg-[#0a0d15] border border-white/5 rounded-lg text-left"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-gray-300">
                      {getCategoryIcon(iss.category)} {iss.category}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono truncate max-w-[200px]" title={iss.file}>
                      · {iss.file}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
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
