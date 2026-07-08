import React, { useState, useEffect, useRef } from "react";
import { WifiOff, FileCode } from "lucide-react";
import GitStatusWidget from "./GitStatusWidget";
import AIStatusWidget from "./AIStatusWidget";
import RepositoryStatusWidget from "./RepositoryStatusWidget";
import PerformanceWidget from "./PerformanceWidget";

interface StatusBarProps {
  gitStatus?: any;
  filesCount?: number;
  symbolsCount?: number;
  activeModel?: string;
  isTaskActive?: boolean;
  isOffline?: boolean;
  encoding?: string;
  language?: string;
  cursorLine?: number;
  cursorCol?: number;
}

export default function StatusBar({
  gitStatus = {},
  filesCount = 0,
  symbolsCount = 0,
  activeModel = "Gemini 1.5 Pro",
  isTaskActive = false,
  isOffline = false,
  encoding = "UTF-8",
  language = "JavaScript",
  cursorLine = 1,
  cursorCol = 1,
}: StatusBarProps) {
  const [openWidget, setOpenWidget] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleWidget = (widgetId: string) => {
    setOpenWidget((prev) => (prev === widgetId ? null : widgetId));
  };

  // Click outside listener to close open status overlays
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenWidget(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[24px] bg-panel border-t border-border text-[10px] text-muted font-mono px-3 shrink-0 select-none flex items-center justify-between z-30"
    >
      {/* Left side options */}
      <div className="flex items-center gap-4">
        {/* Git Widget */}
        {React.createElement(GitStatusWidget as any, {
          gitStatus,
          isOpen: openWidget === "git",
          onToggle: () => toggleWidget("git"),
        })}

        {/* Repository Index Widget */}
        {React.createElement(RepositoryStatusWidget as any, {
          filesCount,
          symbolsCount,
          dependencyNodes: filesCount * 2,
          isOpen: openWidget === "repo",
          onToggle: () => toggleWidget("repo"),
        })}

        {/* Connection state */}
        <div className="flex items-center gap-1.5 text-success font-bold select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-success glowing-dot animate-pulse" />
          <span>Connected</span>
        </div>
      </div>

      {/* Middle connection warnings */}
      {isOffline && (
        <div className="flex items-center gap-1 text-danger font-bold animate-pulse select-none">
          <WifiOff className="w-3 h-3" />
          <span>OFFLINE</span>
        </div>
      )}

      {/* Right side telemetry widgets */}
      <div className="flex items-center gap-4.5 select-none font-semibold">
        {isTaskActive && (
          <div className="flex items-center gap-1 text-accent animate-pulse mr-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent glowing-dot animate-ping mr-1" />
            <span>AI indexing...</span>
          </div>
        )}

        {/* Encoding */}
        <span>{encoding}</span>

        {/* Current File / Language badge */}
        <div className="flex items-center gap-1 text-text">
          <FileCode className="w-3 h-3 text-muted" />
          <span>{language}</span>
        </div>

        {/* Cursor Position */}
        <span>Ln {cursorLine}, Col {cursorCol}</span>

        {/* AI Model Status Widget */}
        {React.createElement(AIStatusWidget as any, {
          activeModel,
          activeTask: isTaskActive ? "Scanning symbols context" : null,
          isOpen: openWidget === "ai",
          onToggle: () => toggleWidget("ai"),
        })}

        {/* Performance live status widget */}
        {React.createElement(PerformanceWidget as any, {
          isOpen: openWidget === "perf",
          onToggle: () => toggleWidget("perf"),
        })}
      </div>
    </div>
  );
}
