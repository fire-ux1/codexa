// @ts-nocheck
export default function WelcomeChecklist({ repoUrl, repoPath }) {
  // Check localStorage keys and repoPath to determine checklist state
  const connected = Boolean(repoUrl) || Boolean(repoPath);
  const indexed = Boolean(repoPath) || localStorage.getItem("codepilot_indexed") === "true";
  const fileOpened = localStorage.getItem("codepilot_file_opened") === "true";
  const aiAsked = localStorage.getItem("codepilot_ai_asked") === "true";
  const reviewed = localStorage.getItem("codepilot_reviewed") === "true";

  const items = [
    { key: "connect", label: "Connect repository URL", done: connected },
    { key: "index", label: "Run workspace code indexer", done: indexed },
    { key: "openFile", label: "Open a file in the workspace", done: fileOpened },
    { key: "askAI", label: "Ask a question in AI Chat", done: aiAsked },
    { key: "review", label: "Generate an AI Code Review", done: reviewed },
  ];

  const completedCount = items.filter((item) => item.done).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <div className="p-6 rounded-3xl border border-white/10 bg-[#0c0f16]/60 backdrop-blur-xl shadow-xl glass relative overflow-hidden space-y-4">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h4 className="text-xs font-bold font-mono tracking-widest text-indigo-400 uppercase">
            ðŸš€ Onboarding Checklist
          </h4>
          <p className="text-[10px] text-gray-500 font-medium">Complete these steps to master the workspace.</p>
        </div>
        <span className="text-[10px] font-bold font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full shrink-0">
          {progressPercent}% Done
        </span>
      </div>

      {/* Progress mini bar */}
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden shrink-0">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
              item.done
                ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400"
                : "bg-white/2 border-white/5 text-gray-400"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                item.done
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "border-white/10 text-transparent"
              }`}
            >
              âœ“
            </span>
            <span className="text-[11px] font-semibold tracking-wide font-mono truncate">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

