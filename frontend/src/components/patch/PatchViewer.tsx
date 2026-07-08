import React, { useState } from "react";

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

interface PatchViewerProps {
  status: "idle" | "generating" | "ready" | "applied" | "rejected";
  summary: string;
  activeFile: string | null | undefined;
  selectionRange: any;
  isStreaming: boolean;
  onRequestPatch: (instruction: string) => void;
}

export default function PatchViewer({
  status,
  summary,
  activeFile,
  selectionRange,
  isStreaming,
  onRequestPatch,
}: PatchViewerProps) {
  const [customInstruction, setCustomInstruction] = useState<string>("");

  const handleQuickPatch = (instruction: string) => {
    if (isStreaming) return;
    onRequestPatch(instruction);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInstruction.trim();
    if (!trimmed || isStreaming) return;
    onRequestPatch(trimmed);
    setCustomInstruction("");
  };

  const fileName = activeFile ? activeFile.split(/[\\/]/).pop() : null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border shrink-0 bg-panel">
        <div className="w-1.5 h-1.5 rounded-full bg-accent glowing-dot" />
        <span className="text-[10px] font-bold text-muted font-mono uppercase tracking-widest">
          AI Patch Generation
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-4">

        {/* Active context */}
        <div className="rounded-xl bg-panel border border-border px-3 py-2 space-y-1.5 shadow-sm">
          <p className="text-[9px] font-mono font-bold text-muted uppercase tracking-widest">Target</p>
          {fileName ? (
            <p className="text-[11px] text-text-strong font-mono truncate">{fileName}</p>
          ) : (
            <p className="text-[11px] text-muted italic font-mono">No file selected</p>
          )}
          {selectionRange ? (
            <p className="text-[10px] text-accent font-mono">
              Selection: Lines {selectionRange.startLine}–{selectionRange.endLine}
            </p>
          ) : (
            <p className="text-[10px] text-muted font-mono italic">Entire file</p>
          )}
        </div>

        {/* AI Summary (once generated) */}
        {summary && (
          <div className="rounded-xl bg-accent-dim/10 border border-accent/25 px-3 py-2.5 space-y-1 shadow-md">
            <p className="text-[9px] font-mono font-bold text-accent uppercase tracking-widest">AI Summary</p>
            <p className="text-[11px] text-text leading-relaxed font-body">{summary}</p>
          </div>
        )}

        {/* Generating indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-dim/5 border border-accent/20">
            <span className="w-3 h-3 border border-accent/25 border-t-accent rounded-full animate-spin shrink-0" />
            <span className="text-[10px] text-accent font-mono">Generating patch…</span>
          </div>
        )}

        {/* Quick instruction buttons */}
        {(status === "idle" || status === "rejected") && !isStreaming && (
          <div className="space-y-2">
            <p className="text-[9px] font-mono font-bold text-muted uppercase tracking-widest">Quick Actions</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PATCH_INSTRUCTIONS.map(({ label, instruction }) => (
                <button
                  key={label}
                  onClick={() => handleQuickPatch(instruction)}
                  disabled={!activeFile}
                  className="px-2.5 py-1.5 text-[10px] font-mono font-bold rounded-lg border text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed border-border text-text hover:text-text-strong hover:bg-panel-alt bg-panel shadow-sm cursor-pointer"
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
            <p className="text-[9px] font-mono font-bold text-muted uppercase tracking-widest">Custom Instruction</p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="e.g. Add type annotations…"
                disabled={!activeFile}
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-[11px] text-text-strong placeholder-muted font-mono outline-none focus:border-accent/40 focus:bg-accent-dim/10 transition-all disabled:opacity-30"
              />
              <button
                type="submit"
                disabled={!customInstruction.trim() || !activeFile}
                className="px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg bg-accent text-bg hover:bg-accent-strong disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              >
                Generate
              </button>
            </div>
          </form>
        )}

        {/* Status messages */}
        {status === "applied" && (
          <div className="rounded-xl bg-success-bg/15 border border-success/35 px-3 py-2.5">
            <p className="text-[11px] text-success font-mono font-semibold">✓ Patch successfully applied to file.</p>
          </div>
        )}

        {status === "rejected" && (
          <div className="rounded-xl bg-danger-bg/15 border border-danger/35 px-3 py-2.5">
            <p className="text-[11px] text-danger font-mono">✕ Patch was rejected. File unchanged.</p>
          </div>
        )}
      </div>
    </div>
  );
}
