// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { fetchRepositoryFiles } from "../../services/api";

const COMMANDS = [
  { key: "architecture", label: "Open Architecture Dependency Graph", icon: "🧩" },
  { key: "review", label: "Run AI Repository Review", icon: "🔍" },
  { key: "analytics", label: "View Repository Analytics", icon: "📊" },
  { key: "graph", label: "Open Call Graph", icon: "🕸️" },
  { key: "knowledge", label: "Open Semantic Knowledge Graph", icon: "🧠" },
  { key: "planner", label: "Open Autonomous Task Planner", icon: "📋" },
  { key: "git", label: "Git Intelligence Dashboard", icon: "🏗️" },
  { key: "chat", label: "Focus AI Chat", icon: "💬" },
  { key: "agents", label: "Focus AI Multi-Agent Session", icon: "🤖" },
  { key: "patch", label: "Focus AI Patch generation", icon: "🩹" },
];

export default function CommandPalette({
  isOpen,
  onClose,
  repoPath,
  onOpenFile,
  onExecuteCommand,
}) {
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Reset query and active index on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setQuery("");
        setActiveIndex(0);
        inputRef.current?.focus();
      }, 50);

      // Load files if repo is available
      if (repoPath) {
        setTimeout(() => {
          setLoading(true);
          fetchRepositoryFiles(repoPath)
            .then((res) => {
              setFiles(res?.files || []);
            })
            .catch((err) => {
              console.error("Failed to load repo files for palette:", err);
            })
            .finally(() => setLoading(false));
        }, 0);
      }
    }
  }, [isOpen, repoPath]);

  // Derived filter list based on query
  const isCommandMode = query.startsWith(">");
  const cleanQuery = isCommandMode ? query.slice(1).trim() : query.trim();

  const filteredItems = useMemo(() => {
    if (isCommandMode) {
      if (!cleanQuery) return COMMANDS;
      return COMMANDS.filter((cmd) =>
        cmd.label.toLowerCase().includes(cleanQuery.toLowerCase())
      );
    } else {
      if (!cleanQuery) return files.slice(0, 15); // Show first 15 files by default
      return files
        .filter((file) => {
          const relPath = file.path.replace(/\\/g, "/");
          return relPath.toLowerCase().includes(cleanQuery.toLowerCase());
        })
        .slice(0, 15); // Limit output
    }
  }, [isCommandMode, cleanQuery, files]);

  // Scroll active element into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems.length > 0) {
        handleSelectItem(filteredItems[activeIndex]);
      }
    }
  };

  const handleSelectItem = (item) => {
    if (isCommandMode) {
      onExecuteCommand(item.key);
    } else {
      onOpenFile(item.path);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 backdrop-blur-md bg-black/60 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0b0e14]/90 backdrop-blur-xl shadow-2xl glass flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 shrink-0 bg-black/20">
          <span className="text-gray-500 font-sans text-sm shrink-0">
            {isCommandMode ? ">" : "🔍"}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isCommandMode
                ? "Type a command name..."
                : "Search files, or type '>' for commands..."
            }
            className="flex-grow bg-transparent text-white font-sans text-sm focus:outline-none border-none placeholder-gray-600 outline-none w-full"
          />
          <button
            onClick={onClose}
            className="text-[10px] uppercase font-sans px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-500 hover:text-white"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[340px] overflow-y-auto min-h-0 flex-grow scrollbar-thin">
          {loading ? (
            <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
              <span className="font-sans text-xs">Scanning files...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-sans text-xs">
              No results found for "{cleanQuery}"
            </div>
          ) : (
            <div ref={listRef} className="p-1.5 space-y-0.5">
              {filteredItems.map((item, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <button
                    key={item.key || item.path}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl font-sans text-xs transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white font-semibold"
                        : "text-gray-400 hover:text-gray-200 hover:bg-white/3"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span>{item.icon || "📄"}</span>
                      <span className="truncate">
                        {isCommandMode
                          ? item.label
                          : item.path.replace(/\\/g, "/").split("/").pop()}
                      </span>
                      {!isCommandMode && (
                        <span
                          className={`truncate text-[9px] font-mono font-normal ${
                            isSelected ? "text-indigo-200" : "text-gray-600"
                          }`}
                        >
                          {item.path.replace(/\\/g, "/")}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="text-[10px] opacity-70 font-sans">
                        ↵ Enter
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Palette Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-black/10 shrink-0 flex items-center justify-between text-[10px] text-muted select-none">
          <div>
            Use <span className="text-text font-bold">↑↓</span> to navigate
          </div>
          <div>
            Type <span className="text-text font-bold">&gt;</span> for commands
          </div>
        </div>
      </div>
    </div>
  );
}

