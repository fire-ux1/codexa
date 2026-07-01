export default function ContextPanel({ repoPath, activeFile, activeSymbol, selectionRange, language, conversationId, isStreaming }) {
  const repoName = repoPath ? repoPath.split(/[\\/]/).pop() : "—";
  const fileName = activeFile ? activeFile.split(/[\\/]/).pop() : "—";

  const rows = [
    { label: "Repository", value: repoName, color: "indigo" },
    { label: "Active File", value: fileName, color: "violet" },
    { label: "Symbol", value: activeSymbol || "—", color: "cyan" },
    {
      label: "Selection",
      value: selectionRange ? `Lines ${selectionRange.startLine}–${selectionRange.endLine}` : "None",
      color: selectionRange ? "amber" : null,
    },
    { label: "Language", value: language?.toUpperCase() || "—", color: "emerald" },
    { label: "Session ID", value: conversationId ? conversationId.slice(0, 8) + "…" : "—", color: null },
    {
      label: "Status",
      value: isStreaming ? "Generating…" : "Ready",
      color: isStreaming ? "rose" : "emerald",
    },
  ];

  const colorMap = {
    indigo: "text-indigo-400",
    violet: "text-violet-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
  };

  return (
    <div className="flex flex-col h-full border-l border-white/5 bg-[#090c13]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0">
        <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 font-mono">Workspace Context</span>
      </div>

      {/* Context rows */}
      <div className="flex-grow overflow-y-auto p-3 space-y-3.5 scrollbar-thin">
        {rows.map((row) => (
          <div key={row.label}>
            <span className="text-[9px] uppercase tracking-wider text-gray-600 font-mono font-bold block mb-0.5">
              {row.label}
            </span>
            <span className={`text-[11px] font-mono break-all leading-snug ${row.color ? colorMap[row.color] : "text-gray-300"}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Model badge */}
      <div className="px-3 py-2.5 border-t border-white/5 shrink-0">
        <span className="text-[9px] text-gray-600 font-mono block">Model</span>
        <span className="text-[10px] text-indigo-400 font-mono font-semibold">OpenRouter LLM</span>
      </div>
    </div>
  );
}
