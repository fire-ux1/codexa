// @ts-nocheck
export default function PatchToolbar({
  status,           // "idle" | "generating" | "ready" | "applied" | "rejected"
  instruction,
  isStreaming,
  hasUndo,
  onApply,
  onReject,
  onCopy,
  onDownload,
  onUndo,
  onStop,
}) {
  const statusConfig = {
    idle:       { label: "No patch",         color: "text-gray-500",   dot: "bg-gray-600" },
    generating: { label: "Generatingâ€¦",      color: "text-amber-400",  dot: "bg-amber-400 animate-pulse" },
    ready:      { label: "Ready to review",  color: "text-indigo-400", dot: "bg-indigo-400" },
    applied:    { label: "Patch applied",    color: "text-emerald-400",dot: "bg-emerald-400" },
    rejected:   { label: "Patch rejected",   color: "text-rose-400",   dot: "bg-rose-500" },
  };

  const cfg = statusConfig[status] || statusConfig.idle;

  return (
    <div className="flex items-center gap-2 px-3 h-10 bg-[#080c14] border-b border-white/5 shrink-0 select-none">
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 mr-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Instruction badge */}
      {instruction && (
        <span className="hidden sm:block px-2 py-0.5 text-[10px] text-gray-400 font-mono bg-white/4 border border-white/8 rounded truncate max-w-[260px]" title={instruction}>
          {instruction}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {/* Stop (while generating) */}
        {isStreaming && (
          <button
            onClick={onStop}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/30 transition-all"
          >
            â–  Stop
          </button>
        )}

        {/* Apply */}
        {status === "ready" && (
          <button
            onClick={onApply}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/35 transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Apply
          </button>
        )}

        {/* Reject */}
        {status === "ready" && (
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-rose-600/15 border border-rose-500/20 text-rose-400 hover:bg-rose-600/25 transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        )}

        {/* Copy */}
        {(status === "ready" || status === "applied") && (
          <button
            onClick={onCopy}
            title="Copy modified code"
            className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-white/5 border border-white/8 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            Copy
          </button>
        )}

        {/* Download */}
        {(status === "ready" || status === "applied") && (
          <button
            onClick={onDownload}
            title="Download patch as .diff"
            className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-white/5 border border-white/8 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            Download
          </button>
        )}

        {/* Undo */}
        {hasUndo && (
          <button
            onClick={onUndo}
            title="Undo last applied patch"
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 010 10H9m-6-10l3-3m-3 3l3 3" />
            </svg>
            Undo
          </button>
        )}
      </div>
    </div>
  );
}

