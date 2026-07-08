import { Cpu, DollarSign, RefreshCw, BarChart2 } from "lucide-react";

interface AIStatusWidgetProps {
  activeModel?: string;
  provider?: string;
  contextLimit?: string;
  promptTokens?: number;
  completionTokens?: number;
  activeTask?: string | null;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function AIStatusWidget({
  activeModel = "Gemini 1.5 Pro",
  provider = "Google OpenRouter",
  contextLimit = "2,000,000",
  promptTokens = 12450,
  completionTokens = 3840,
  activeTask = null,
  isOpen,
  onToggle,
}: AIStatusWidgetProps) {
  const totalTokens = promptTokens + completionTokens;
  const estimatedCost = ((promptTokens * 0.0015 + completionTokens * 0.002) / 1000).toFixed(5);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer font-bold text-[10px] font-mono ${
          isOpen ? "bg-accent-dim/10 text-accent border border-accent/25" : "hover:bg-panel-alt text-muted"
        }`}
      >
        <Cpu className="w-3 h-3 text-success shrink-0" />
        <span>{activeModel}</span>
        {activeTask && (
          <span className="flex items-center gap-1 text-[9px] text-accent animate-pulse bg-accent-dim/10 px-1.5 py-0.2 rounded font-mono font-semibold ml-1">
            <RefreshCw className="w-2 h-2 animate-spin" /> {activeTask}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-6 right-0 w-64 bg-bg border border-border rounded-xl shadow-2xl p-3.5 z-50 animate-fade-in font-mono text-[10px] space-y-3.5 select-none text-left">
          <div className="border-b border-border pb-2 flex justify-between items-center">
            <span className="text-muted font-bold uppercase tracking-wider">AI Intelligence Status</span>
            <span className="text-[9px] bg-success-bg/15 text-success px-1.5 py-0.2 rounded border border-success/20 font-bold">ACTIVE</span>
          </div>

          <div className="space-y-2 text-muted">
            <div className="flex justify-between">
              <span>Model Provider:</span>
              <span className="text-text-strong font-bold">{provider}</span>
            </div>
            <div className="flex justify-between">
              <span>Context Limit:</span>
              <span className="text-text-strong font-bold">{contextLimit} tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Prompt Tokens:</span>
              <span className="text-text font-bold">{promptTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Completion Tokens:</span>
              <span className="text-text font-bold">{completionTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-1.5">
              <span className="flex items-center gap-0.5 text-muted">
                <BarChart2 className="w-3.5 h-3.5 text-accent" /> Total Tokens:
              </span>
              <span className="text-accent font-bold">{totalTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-0.5 text-muted">
                <DollarSign className="w-3.5 h-3.5 text-success" /> Estimated Cost:
              </span>
              <span className="text-success font-bold">${estimatedCost}</span>
            </div>
          </div>

          {activeTask && (
            <div className="p-2 rounded bg-accent-dim/10 border border-accent/20 text-accent text-[9.5px]">
              <span className="font-bold flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Active Pipeline Operation
              </span>
              <p className="text-muted mt-1 font-sans">The AI is currently processing: {activeTask}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
