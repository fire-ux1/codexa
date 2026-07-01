import { useState, useRef, useEffect } from "react";

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

export default function PromptBox({ onSubmit, isStreaming, onStop, hasSelection, selectionRange }) {
  const [value, setValue] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const textareaRef = useRef(null);

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

  const handleChange = (e) => {
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

  const handleKeyDown = (e) => {
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

  const insertSlashCmd = (cmd) => {
    setValue(cmd + " ");
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const filteredCmds = SLASH_COMMANDS.filter((c) =>
    slashFilter ? c.cmd.startsWith("/" + slashFilter) : true
  );

  return (
    <div className="px-3 pb-3 pt-2 border-t border-white/5 shrink-0 relative">
      {/* Selection indicator */}
      {hasSelection && selectionRange && (
        <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <span className="text-[10px] font-mono text-amber-400">
            Selection active — Lines {selectionRange.startLine}–{selectionRange.endLine}
          </span>
        </div>
      )}

      {/* Slash command menu */}
      {showSlashMenu && filteredCmds.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl bg-[#0f1420] border border-white/10 overflow-hidden shadow-2xl z-50">
          <div className="px-3 py-1.5 border-b border-white/5">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-mono font-bold">Slash Commands</span>
          </div>
          {filteredCmds.map((c) => (
            <button
              key={c.cmd}
              onMouseDown={(e) => { e.preventDefault(); insertSlashCmd(c.cmd); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-indigo-600/15 transition-colors"
            >
              <span className="text-[11px] font-mono text-indigo-400 font-semibold w-24 shrink-0">{c.cmd}</span>
              <span className="text-[10px] text-gray-500">{c.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative rounded-xl bg-white/4 border border-white/8 focus-within:border-indigo-500/40 focus-within:bg-indigo-500/4 transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… or type / for commands"
            rows={1}
            disabled={false}
            className="w-full bg-transparent resize-none px-3 py-2.5 text-[12px] text-gray-200 placeholder-gray-600 font-mono outline-none leading-relaxed scrollbar-thin"
            style={{ maxHeight: "160px" }}
          />
        </div>
        <button
          onClick={isStreaming ? onStop : handleSubmit}
          disabled={!isStreaming && !value.trim()}
          className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            isStreaming
              ? "bg-rose-600/30 border border-rose-500/30 text-rose-400 hover:bg-rose-600/40"
              : value.trim()
              ? "bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/30"
              : "bg-white/5 border border-white/8 text-gray-600 cursor-not-allowed"
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
      <p className="text-[9px] text-gray-700 font-mono mt-1.5 px-0.5">
        ↵ Send · Shift+↵ New line · / for commands
      </p>
    </div>
  );
}
