import { useState, useEffect } from "react";
import { Loader2, FileText } from "lucide-react";

interface ThinkingIndicatorProps {
  currentStep?: number;
}

export function ThinkingIndicator({ currentStep = 0 }: ThinkingIndicatorProps) {
  const steps = [
    "Reading repository structure...",
    "Scanning code abstract syntax tree...",
    "Understanding import dependency chains...",
    "Assembling context reference bindings...",
    "Formulating response explanation...",
  ];

  return (
    <div className="bg-panel border border-border rounded-xl p-4.5 space-y-3 shadow-lg select-none text-left">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
        <span className="text-[10px] font-mono font-bold uppercase text-accent tracking-wider">
          AI Indexing Context...
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((stepText, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div key={idx} className="flex items-center gap-2.5 text-[9.5px] font-mono">
              {isCompleted ? (
                <span className="text-success font-bold">✓</span>
              ) : isCurrent ? (
                <Loader2 className="w-3 h-3 text-accent animate-spin shrink-0" />
              ) : (
                <span className="text-muted font-bold">•</span>
              )}
              <span
                className={
                  isCompleted
                    ? "text-muted line-through opacity-65"
                    : isCurrent
                    ? "text-text-strong font-bold"
                    : "text-muted"
                }
              >
                {stepText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LiveContextPanelProps {
  activeFile?: string;
  references?: string[];
}

export function LiveContextPanel({ activeFile = "", references = [] }: LiveContextPanelProps) {
  return (
    <div className="p-3 bg-panel-alt/60 border border-border rounded-xl space-y-2 text-left select-none font-mono text-[9px]">
      <span className="text-muted uppercase font-bold tracking-wider block mb-1">Knowledge Sources</span>
      {activeFile && (
        <div className="flex items-center gap-1.5 text-text-strong bg-panel border border-border p-1.5 rounded-lg truncate shadow-sm">
          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">Active: {activeFile.split(/[/\\]/).pop()}</span>
        </div>
      )}
      {references.length > 0 && (
        <div className="space-y-1 pt-1.5 border-t border-border">
          <span className="text-muted font-bold uppercase block">Referenced Modules:</span>
          {references.map((ref, idx) => (
            <div key={idx} className="flex items-center gap-1 text-text truncate pl-1">
              <span>•</span>
              <span className="truncate">{ref.split(/[/\\]/).pop()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TokenUsageCardProps {
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
}

export function TokenUsageCard({ promptTokens = 425, completionTokens = 188, latencyMs = 840 }: TokenUsageCardProps) {
  const estimatedCost = ((promptTokens * 0.0015 + completionTokens * 0.002) / 1000).toFixed(6);

  return (
    <div className="p-3 bg-panel border border-border rounded-xl space-y-2 text-left font-mono text-[9px] select-none text-muted shadow-sm">
      <div className="flex justify-between items-center border-b border-border pb-1.5">
        <span className="text-text uppercase font-bold tracking-wider">AI Telemetry stats</span>
        <span className="text-accent font-bold">{latencyMs}ms</span>
      </div>
      <div className="flex justify-between">
        <span>Prompt Tokens:</span>
        <span className="text-text-strong font-bold">{promptTokens}</span>
      </div>
      <div className="flex justify-between">
        <span>Completion Tokens:</span>
        <span className="text-text-strong font-bold">{completionTokens}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
        <span>Estimated Cost:</span>
        <span className="text-accent font-bold">${estimatedCost}</span>
      </div>
    </div>
  );
}

interface StreamingResponseProps {
  text?: string;
  isStreaming?: boolean;
  activeFile?: string;
  references?: string[];
}

export default function StreamingResponse({
  text = "",
  isStreaming = false,
  activeFile = "",
  references = [],
}: StreamingResponseProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="space-y-4 p-1">
      {isStreaming && currentStep < 4 && (
        <ThinkingIndicator currentStep={currentStep} />
      )}

      {text && (
        <div className="bg-panel border border-border rounded-2xl p-4.5 shadow text-left font-sans text-xs leading-relaxed text-text">
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {activeFile && (
          <LiveContextPanel activeFile={activeFile} references={references} />
        )}
        <TokenUsageCard
          promptTokens={240 + text.length}
          completionTokens={Math.max(10, Math.floor(text.length * 0.2))}
        />
      </div>
    </div>
  );
}
