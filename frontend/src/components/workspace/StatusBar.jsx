import { GitBranch, Database, Cpu, RefreshCw, WifiOff } from "lucide-react";

export default function StatusBar({
  branch = "main",
  filesCount = 0,
  symbolsCount = 0,
  activeModel = "Gemini 1.5 Flash",
  isTaskActive = false,
  isOffline = false,
}) {
  return (
    <div className="h-[24px] bg-[#0c0f16] border-t border-[#1c2230] text-[10px] text-gray-500 font-mono px-3 shrink-0 select-none flex items-center justify-between z-30">
      {/* Left side parameters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-gray-400">
          <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
          <span>{branch}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-gray-600" />
          <span>{filesCount} files</span>
        </div>

        {symbolsCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-600 font-sans">🔑</span>
            <span>{symbolsCount} symbols</span>
          </div>
        )}
      </div>

      {/* Middle connection warnings */}
      {isOffline && (
        <div className="flex items-center gap-1 text-rose-500 font-bold animate-pulse">
          <WifiOff className="w-3 h-3" />
          <span>OFFLINE</span>
        </div>
      )}

      {/* Right side options */}
      <div className="flex items-center gap-4">
        {isTaskActive && (
          <div className="flex items-center gap-1 text-indigo-400">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Indexing...</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-gray-400">
          <Cpu className="w-3 h-3 text-emerald-500" />
          <span>{activeModel}</span>
        </div>
      </div>
    </div>
  );
}
