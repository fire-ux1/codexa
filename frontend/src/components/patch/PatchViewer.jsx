import { useState } from "react";

const PATCH_INSTRUCTIONS = [
  { label: "Refactor", instruction: "Refactor this code for readability and clean architecture" },
  { label: "Fix Bugs", instruction: "Find and fix all bugs in this code" },
  { label: "Optimize", instruction: "Optimize this code for performance" },
  { label: "Add Docs", instruction: "Generate comprehensive docstrings and inline comments" },
  { label: "Add Tests", instruction: "Generate unit tests for this code" },
  { label: "Modernize", instruction: "Modernize this legacy code using current best practices" },
  { label: "Security", instruction: "Fix all security vulnerabilities in this code" },
  { label: "Simplify", instruction: "Simplify and reduce complexity of this code" },
];

export default function PatchViewer({
  status,           // "idle" | "generating" | "ready" | "applied" | "rejected"
  summary,
  activeFile,
  selectionRange,
  isStreaming,
  onRequestPatch,   // (instruction: string) => void
}) {
  const [customInstruction, setCustomInstruction] = useState("");

  const handleQuickPatch = (instruction) => {
    if (isStreaming) return;
    onRequestPatch(instruction);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const trimmed = customInstruction.trim();
    if (!trimmed || isStreaming) return;
    onRequestPatch(trimmed);
    setCustomInstruction("");
  };

  const fileName = activeFile ? activeFile.split(/[\\/]/).pop() : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-white/5 shrink-0 bg-[#090c14]">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-widest">
          AI Patch Generation
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-4">

        {/* Active context */}
        <div className="rounded-xl bg-white/3 border border-white/6 px-3 py-2 space-y-1.5">
          <p className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Target</p>
          {fileName ? (
            <p className="text-[11px] text-gray-300 font-mono truncate">{fileName}</p>
          ) : (
            <p className="text-[11px] text-gray-600 italic font-mono">No file selected</p>
          )}
          {selectionRange ? (
            <p className="text-[10px] text-amber-400 font-mono">
              Selection: Lines {selectionRange.startLine}–{selectionRange.endLine}
            </p>
          ) : (
            <p className="text-[10px] text-gray-600 font-mono italic">Entire file</p>
          )}
        </div>

        {/* AI Summary (once generated) */}
        {summary && (
          <div className="rounded-xl bg-indigo-600/10 border border-indigo-500/20 px-3 py-2.5 space-y-1">
            <p className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest">AI Summary</p>
            <p className="text-[11px] text-gray-300 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Generating indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
            <span className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin shrink-0" />
            <span className="text-[10px] text-amber-400 font-mono">Generating patch…</span>
          </div>
        )}

        {/* Quick instruction buttons */}
        {(status === "idle" || status === "rejected") && !isStreaming && (
          <div className="space-y-2">
            <p className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Quick Actions</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PATCH_INSTRUCTIONS.map(({ label, instruction }) => (
                <button
                  key={label}
                  onClick={() => handleQuickPatch(instruction)}
                  disabled={!activeFile}
                  className="px-2.5 py-1.5 text-[10px] font-mono font-bold rounded-lg border text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed border-white/8 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/15 bg-white/3"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom instruction input */}
        {(status === "idle" || status === "rejected") && !isStreaming && (
          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <p className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">Custom Instruction</p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="e.g. Add type annotations…"
                disabled={!activeFile}
                className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-1.5 text-[11px] text-gray-300 placeholder-gray-600 font-mono outline-none focus:border-violet-500/40 focus:bg-violet-500/5 transition-all disabled:opacity-30"
              />
              <button
                type="submit"
                disabled={!customInstruction.trim() || !activeFile}
                className="px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
              >
                Generate
              </button>
            </div>
          </form>
        )}

        {/* Status messages */}
        {status === "applied" && (
          <div className="rounded-xl bg-emerald-600/10 border border-emerald-500/20 px-3 py-2.5">
            <p className="text-[11px] text-emerald-400 font-mono font-semibold">✓ Patch successfully applied to file.</p>
          </div>
        )}

        {status === "rejected" && (
          <div className="rounded-xl bg-rose-600/10 border border-rose-500/20 px-3 py-2.5">
            <p className="text-[11px] text-rose-400 font-mono">✕ Patch was rejected. File unchanged.</p>
          </div>
        )}
      </div>
    </div>
  );
}
