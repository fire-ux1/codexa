import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { TaskItem } from "./TaskTimeline";

interface ExecutionPanelProps {
  task: TaskItem | null | undefined;
  execData: {
    updated: string;
    original: string;
    test_code?: string;
    audit?: string;
  } | null | undefined;
  onExecuteTask: (task: TaskItem) => void;
  onApplyPatch: (task: TaskItem, updatedContent: string) => void;
  onUndoPatch: (task: TaskItem, originalContent: string) => void;
  isExecuting: boolean;
  isApplying: boolean;
  isUndoing: boolean;
}

export default function ExecutionPanel({
  task,
  execData,
  onExecuteTask,
  onApplyPatch,
  onUndoPatch,
  isExecuting,
  isApplying,
  isUndoing,
}: ExecutionPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>("diff");

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-xs font-mono select-none bg-bg">
        Select a task step from checklist to view execution pipeline.
      </div>
    );
  }

  const hasOutput = !!execData;

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-bg select-text border border-border rounded-xl overflow-hidden">
      
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-panel border-b border-border shrink-0 select-none">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-mono font-bold text-text-strong">
            Task Execution: {task.file.split(/[/\\]/).pop()}
          </span>
          <span className="text-[8px] font-mono text-muted mt-0.5">
            Path: {task.file}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {!hasOutput ? (
            <button
              onClick={() => onExecuteTask && onExecuteTask(task)}
              disabled={isExecuting}
              className="px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg bg-accent text-bg hover:bg-accent-strong transition-all disabled:opacity-40 cursor-pointer"
            >
              {isExecuting ? "Executing step..." : "Execute Step (Write Code)"}
            </button>
          ) : (
            <>
              {task.status !== "completed" ? (
                <button
                  onClick={() => onApplyPatch && onApplyPatch(task, execData.updated)}
                  disabled={isApplying}
                  className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-success text-bg hover:bg-success-strong transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isApplying ? "Applying..." : "Apply Code"}
                </button>
              ) : (
                <button
                  onClick={() => onUndoPatch && onUndoPatch(task, execData.original)}
                  disabled={isUndoing}
                  className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-danger text-bg hover:bg-danger-strong transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isUndoing ? "Reverting..." : "Undo Code"}
                </button>
              )}
              <button
                onClick={() => onExecuteTask && onExecuteTask(task)}
                disabled={isExecuting}
                className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-panel border border-border text-text hover:text-text-strong transition-all disabled:opacity-40 cursor-pointer"
              >
                Re-Run
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main output workspace */}
      {!hasOutput ? (
        <div className="flex-grow flex flex-col items-center justify-center gap-3 p-6 text-center select-none bg-bg">
          {isExecuting ? (
            <>
              <span className="w-5 h-5 border border-accent/20 border-t-accent rounded-full animate-spin shrink-0" />
              <span className="text-[10px] text-accent font-mono tracking-widest uppercase animate-pulse">
                Autonomous planner generating updates and test scripts...
              </span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-accent-dim/10 border border-accent/20 flex items-center justify-center">
                <span className="text-accent text-lg">⚙️</span>
              </div>
              <div className="space-y-1">
                <p className="text-text-strong font-semibold text-xs">Task Step Pending Execution</p>
                <p className="text-muted text-[10px] leading-relaxed max-w-sm">
                  Click 'Execute Step' to generate code patches, automated unit test suites, and linter-audits for this module.
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-grow flex-1 flex flex-col min-h-0">
          
          {/* Sub-tabs strip */}
          <div className="flex items-center border-b border-border bg-panel-alt px-3 shrink-0 select-none">
            {[
              { key: "diff", label: "Proposed Code" },
              { key: "tests", label: "Automated Tests" },
              { key: "audit", label: "Linter Audit" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`px-4 py-2.5 text-[9px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  activeSubTab === tab.key
                    ? "border-accent text-accent bg-accent-dim/10"
                    : "border-transparent text-muted hover:text-text-strong hover:bg-panel-alt"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab view contents */}
          <div className="flex-grow flex-1 overflow-auto p-4 scrollbar-thin font-mono text-[11px] leading-relaxed bg-bg">
            
            {/* View A: CODE / DIFF */}
            {activeSubTab === "diff" && (
              <pre className="text-left text-text whitespace-pre-wrap break-all select-text selection:bg-accent/30 bg-panel p-3 rounded-lg border border-border">
                {execData.updated}
              </pre>
            )}

            {/* View B: TESTS */}
            {activeSubTab === "tests" && (
              <pre className="text-left text-accent whitespace-pre-wrap break-all select-text selection:bg-accent/30 bg-panel p-3 rounded-lg border border-border">
                {execData.test_code || "No test cases generated."}
              </pre>
            )}

            {/* View C: AUDIT */}
            {activeSubTab === "audit" && (
              <div className="text-left text-text bg-panel p-4 rounded-lg border border-border leading-relaxed font-mono select-text selection:bg-accent/30">
                <ReactMarkdown
                  components={{
                    p({ children }) {
                      return <p className="mb-2 last:mb-0 text-text">{children}</p>;
                    },
                    li({ children }) {
                      return <li className="text-text mb-1 leading-normal list-disc pl-1 ml-4">{children}</li>;
                    },
                  }}
                >
                  {execData.audit || "No warnings detected."}
                </ReactMarkdown>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
