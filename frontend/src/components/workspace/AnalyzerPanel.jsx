import { IconCpu, IconNetwork, IconFlow, IconArrowRight } from "../icons/Icons";

export default function AnalyzerPanel({
  onGetArchitecture,
  onGetCallGraph,
  onGetFlow,
  isArchitectureLoading,
  isGraphLoading,
  isFlowLoading,
}) {
  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-gray-900/40 glass">
      <div className="flex items-center gap-2 mb-4">
        <IconCpu className="w-4 h-4 text-purple-400" />
        <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400">Codebase Analyzers</h3>
      </div>

      <div className="space-y-3">
        <button
          onClick={onGetArchitecture}
          disabled={isArchitectureLoading}
          className="w-full px-4 py-3 rounded-xl border border-white/10 hover:border-indigo-500/40 bg-white/5 hover:bg-indigo-500/5 text-left text-sm font-semibold text-white transition-all flex items-center justify-between"
        >
          <span className="flex items-center gap-2.5">
            <IconCpu className="w-4 h-4 text-indigo-400" /> Codebase Architecture
          </span>
          {isArchitectureLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></span>
          ) : (
            <IconArrowRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        <button
          onClick={onGetCallGraph}
          disabled={isGraphLoading}
          className="w-full px-4 py-3 rounded-xl border border-white/10 hover:border-purple-500/40 bg-white/5 hover:bg-purple-500/5 text-left text-sm font-semibold text-white transition-all flex items-center justify-between"
        >
          <span className="flex items-center gap-2.5">
            <IconNetwork className="w-4 h-4 text-purple-400" /> Code Call Graph
          </span>
          {isGraphLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin"></span>
          ) : (
            <IconArrowRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        <button
          onClick={onGetFlow}
          disabled={isFlowLoading}
          className="w-full px-4 py-3 rounded-xl border border-white/10 hover:border-emerald-500/40 bg-white/5 hover:bg-emerald-500/5 text-left text-sm font-semibold text-white transition-all flex items-center justify-between"
        >
          <span className="flex items-center gap-2.5">
            <IconFlow className="w-4 h-4 text-emerald-400" /> Execution Flow
          </span>
          {isFlowLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin"></span>
          ) : (
            <IconArrowRight className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>
    </div>
  );
}
