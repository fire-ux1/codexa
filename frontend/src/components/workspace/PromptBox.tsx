import React, { useState, useRef, useEffect } from "react";

const SLASH_COMMANDS = [
  { cmd: "/explain", desc: "Explain selected or active code" },
  { cmd: "/review", desc: "Code review with issue detection" },
  { cmd: "/test", desc: "Generate unit tests" },
  { cmd: "/docs", desc: "Generate documentation" },
  { cmd: "/refactor", desc: "Refactoring suggestions" },
  { cmd: "/security", desc: "Security vulnerability scan" },
  { cmd: "/architecture", desc: "Explain architectural role" },
  { cmd: "/summary", desc: "High-level module summary" },
];

interface PromptBoxProps {
  onSubmit: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  hasSelection: boolean;
  selectionRange: any;
}

export default function PromptBox({
  onSubmit,
  isStreaming,
  onStop,
  hasSelection,
  selectionRange,
}: PromptBoxProps) {
  const [value, setValue] = useState<string>("");
  const [showSlashMenu, setShowSlashMenu] = useState<boolean>(false);
  const [slashFilter, setSlashFilter] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
    setValue("");
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setValue(val);
    const slashMatch = val.match(/^(\/)(\w*)$/);
    if (slashMatch) {
      setSlashFilter(slashMatch[2]);
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
      setSlashFilter("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) {
        handleSubmit();
      }
    }
    if (e.key === "Escape") {
      setShowSlashMenu(false);
    }
  };

  const insertSlashCmd = (cmd: string) => {
    setValue(cmd + " ");
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const filteredCmds = SLASH_COMMANDS.filter((c) =>
    slashFilter ? c.cmd.startsWith("/" + slashFilter) : true
  );

  return (
    <div className="px-3 pb-3 pt-2 border-t border-border shrink-0 relative bg-panel">
      {/* Selection indicator */}
      {hasSelection && selectionRange && (
        <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-md bg-accent/15 border border-accent/25 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 glowing-dot" />
          <span className="text-[10px] font-mono text-accent font-semibold">
            Selection active — Lines {selectionRange.startLine}–{selectionRange.endLine}
          </span>
        </div>
      )}

      {/* Slash command menu */}
      {showSlashMenu && filteredCmds.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl bg-panel border border-border overflow-hidden shadow-2xl z-50 select-none">
          <div className="px-3 py-1.5 border-b border-border bg-panel-alt">
            <span className="text-[9px] uppercase tracking-widest text-muted font-mono font-bold">Slash Commands</span>
          </div>
          {filteredCmds.map((c) => (
            <button
              key={c.cmd}
              onMouseDown={(e) => { e.preventDefault(); insertSlashCmd(c.cmd); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-accent-dim/15 transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-mono text-accent font-semibold w-24 shrink-0">{c.cmd}</span>
              <span className="text-[10px] text-muted">{c.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative rounded-xl bg-bg border border-border focus-within:border-accent/40 focus-within:bg-accent-dim/5 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… or type / for commands"
            rows={1}
            className="w-full bg-transparent resize-none px-3 py-2.5 text-[12px] text-text-strong placeholder-muted font-mono outline-none leading-relaxed scrollbar-thin"
            style={{ maxHeight: "160px" }}
          />
        </div>
        <button
          onClick={isStreaming ? onStop : handleSubmit}
          disabled={!isStreaming && !value.trim()}
          className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            isStreaming
              ? "bg-danger-bg/25 border border-danger/35 text-danger hover:bg-danger/35"
              : value.trim()
              ? "bg-accent border border-accent-strong text-bg hover:bg-accent-strong shadow-lg shadow-accent/25"
              : "bg-panel-alt border border-border text-muted cursor-not-allowed"
          }`}
        >
          {isStreaming ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
              <rect x="2" y="2" width="8" height="8" rx="1" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Hint footer */}
      <p className="text-[9px] text-muted font-mono mt-1.5 px-0.5 select-none">
        ↵ Send · Shift+↵ New line · / for commands
      </p>
    </div>
  );
}
