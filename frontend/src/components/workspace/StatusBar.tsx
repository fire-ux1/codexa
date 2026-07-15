import { useState, useEffect, useRef, useCallback } from "react";
import { WifiOff, FileCode, AlertTriangle } from "lucide-react";
import GitStatusWidget from "./GitStatusWidget";
import AIStatusWidget from "./AIStatusWidget";
import RepositoryStatusWidget from "./RepositoryStatusWidget";
import PerformanceWidget from "./PerformanceWidget";



interface StatusBarProps {
  gitStatus?: any;
  filesCount?: number;
  symbolsCount?: number;
  /** Optional: real dependency-graph node count. Omitted from the widget if not provided —
   *  we no longer fabricate this from filesCount. */
  dependencyNodes?: number;
  activeModel?: string;
  isTaskActive?: boolean;
  isOffline?: boolean;
  encoding?: string;
  language?: string;
  cursorLine?: number;
  cursorCol?: number;
  indexingProgress?: any;
}

const RETRY_INDICATOR_TIMEOUT_MS = 4000;

interface RetryEventDetail {
  attempt: number;
  maxAttempts: number;
  delay: number;
}

function isRetryEventDetail(detail: unknown): detail is RetryEventDetail {
  return (
    typeof detail === "object" &&
    detail !== null &&
    typeof (detail as RetryEventDetail).attempt === "number" &&
    typeof (detail as RetryEventDetail).maxAttempts === "number"
  );
}

export default function StatusBar({
  gitStatus = {},
  filesCount = 0,
  symbolsCount = 0,
  dependencyNodes,
  activeModel = "Gemini 1.5 Pro",
  isTaskActive = false,
  isOffline = false,
  encoding = "UTF-8",
  language = "JavaScript",
  cursorLine = 1,
  cursorCol = 1,
  indexingProgress = null,
}: StatusBarProps) {
  const [openWidget, setOpenWidget] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Retry indicator state — populated by the Axios response interceptor
  const [retryInfo, setRetryInfo] = useState<{
    attempt: number;
    maxAttempts: number;
  } | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleWidget = useCallback((widgetId: string) => {
    setOpenWidget((prev) => (prev === widgetId ? null : widgetId));
  }, []);

  const closeWidget = useCallback(() => setOpenWidget(null), []);

  // Click outside listener to close open status overlays
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeWidget();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [closeWidget]);

  // Escape key closes any open widget popover
  useEffect(() => {
    if (!openWidget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWidget();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openWidget, closeWidget]);

  // Listen for API retry events dispatched by the Axios interceptor
  useEffect(() => {
    const handleRetry = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      if (!isRetryEventDetail(detail)) {
        console.warn("Ignored malformed api_request_retry event", detail);
        return;
      }
      setRetryInfo({ attempt: detail.attempt, maxAttempts: detail.maxAttempts });

      // Auto-clear the indicator a few seconds after the last retry event
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        setRetryInfo(null);
      }, RETRY_INDICATOR_TIMEOUT_MS);
    };

    window.addEventListener("api_request_retry", handleRetry);
    return () => {
      window.removeEventListener("api_request_retry", handleRetry);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[24px] bg-panel border-t border-border text-[10px] text-muted font-mono px-3 shrink-0 select-none flex items-center justify-between z-30"
    >
      {/* Left side options */}
      <div className="flex items-center gap-4">
        {/* Git Widget */}
        <GitStatusWidget
          gitStatus={gitStatus}
          isOpen={openWidget === "git"}
          onToggle={() => toggleWidget("git")}
        />

        {/* Repository Index Widget */}
        <RepositoryStatusWidget
          filesCount={filesCount}
          symbolsCount={symbolsCount}
          dependencyNodes={dependencyNodes}
          isOpen={openWidget === "repo"}
          onToggle={() => toggleWidget("repo")}
        />

        {/* Connection state — single source of truth derived from isOffline,
            so this can never contradict the OFFLINE banner below. */}
        <div
          className={`flex items-center gap-1.5 font-bold select-none ${
            isOffline ? "text-danger" : "text-success"
          }`}
        >
          {isOffline ? (
            <WifiOff className="w-3 h-3" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-success glowing-dot animate-pulse" />
          )}
          <span>{isOffline ? "Disconnected" : "Connected"}</span>
        </div>
      </div>

      {/* Middle: connection warnings + retry indicator */}
      <div className="flex items-center gap-3">
        {isOffline && (
          <div className="flex items-center gap-1 text-danger font-bold animate-pulse select-none">
            <WifiOff className="w-3 h-3" />
            <span>OFFLINE</span>
          </div>
        )}

        {retryInfo && (
          <div className="flex items-center gap-1 text-amber-400 font-bold animate-pulse select-none">
            <AlertTriangle className="w-3 h-3" />
            <span>
              Retry {retryInfo.attempt}/{retryInfo.maxAttempts}…
            </span>
          </div>
        )}
      </div>

      {/* Right side telemetry widgets */}
      <div className="flex items-center gap-4 select-none font-semibold">
        {isTaskActive && (
          <div className="flex items-center gap-1 text-accent animate-pulse mr-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent glowing-dot animate-ping mr-1" />
            <span>
              ◆ Indexing {indexingProgress && typeof indexingProgress.progress === "number" ? `${Math.round(indexingProgress.progress)}%` : "..."}
            </span>
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
        <AIStatusWidget
          activeModel={activeModel}
          activeTask={isTaskActive ? "Scanning symbols context" : null}
          isOpen={openWidget === "ai"}
          onToggle={() => toggleWidget("ai")}
        />

        {/* Performance live status widget */}
        <PerformanceWidget
          isOpen={openWidget === "perf"}
          onToggle={() => toggleWidget("perf")}
        />
      </div>
    </div>
  );
}