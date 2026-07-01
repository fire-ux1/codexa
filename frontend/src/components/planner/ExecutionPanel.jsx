import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function ExecutionPanel({
  task,
  execData,
  onExecuteTask,
  onApplyPatch,
  onUndoPatch,
  isExecuting,
  isApplying,
  isUndoing,
}) {
  const [activeSubTab, setActiveSubTab] = useState("diff"); // "diff" | "tests" | "audit"

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono select-none bg-[#06080d]">
        Select a task step from checklist to view execution pipeline.
      </div>
    );
  }

  const hasOutput = !!execData;

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#06080d] select-text">
      
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#090c14] border-b border-white/5 shrink-0 select-none">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-mono font-bold text-gray-300">
            Task Execution: {task.file.split(/[/\\]/).pop()}
          </span>
          <span className="text-[8px] font-mono text-gray-500 mt-0.5">
            Path: {task.file}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {!hasOutput ? (
            <button
              onClick={() => onExecuteTask && onExecuteTask(task)}
              disabled={isExecuting}
              className="px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 text-white transition-all disabled:opacity-40"
            >
              {isExecuting ? "Executing step..." : "Execute Step (Write Code)"}
            </button>
          ) : (
            <>
              {task.status !== "completed" ? (
                <button
                  onClick={() => onApplyPatch && onApplyPatch(task, execData.updated)}
                  disabled={isApplying}
                  className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 text-white transition-all disabled:opacity-40"
                >
                  {isApplying ? "Applying..." : "Apply Code"}
                </button>
              ) : (
                <button
                  onClick={() => onUndoPatch && onUndoPatch(task, execData.original)}
                  disabled={isUndoing}
                  className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-rose-600 border border-rose-500 hover:bg-rose-500 text-white transition-all disabled:opacity-40"
                >
                  {isUndoing ? "Reverting..." : "Undo Code"}
                </button>
              )}
              <button
                onClick={() => onExecuteTask && onExecuteTask(task)}
                disabled={isExecuting}
                className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg bg-white/5 border border-white/8 text-gray-400 hover:text-white transition-all disabled:opacity-40"
              >
                Re-Run
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main output workspace */}
      {!hasOutput ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center select-none">
          {isExecuting ? (
            <>
              <span className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shrink-0" />
              <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase animate-pulse">
                Autonomous planner generating updates and test scripts...
              </span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <span className="text-indigo-400 text-lg">⚙️</span>
              </div>
              <div className="space-y-1">
                <p className="text-white font-semibold text-xs">Task Step Pending Execution</p>
                <p className="text-gray-500 text-[10px] leading-relaxed max-w-sm">
                  Click 'Execute Step' to generate code patches, automated unit test suites, and linter-audits for this module.
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Sub-tabs strip */}
          <div className="flex items-center border-b border-white/5 bg-[#090c14]/40 px-3 shrink-0 select-none">
            {[
              { key: "diff", label: "Proposed Code" },
              { key: "tests", label: "Automated Tests" },
              { key: "audit", label: "Linter Audit" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`px-4 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 ${
                  activeSubTab === tab.key
                    ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab view contents */}
          <div className="flex-1 overflow-auto p-4 scrollbar-thin font-mono text-[11px] leading-relaxed">
            
            {/* View A: CODE / DIFF */}
            {activeSubTab === "diff" && (
              <pre className="text-left text-gray-300 whitespace-pre-wrap break-all select-text selection:bg-indigo-500/30 bg-[#07090f] p-3 rounded-lg border border-white/4">
                {execData.updated}
              </pre>
            )}

            {/* View B: TESTS */}
            {activeSubTab === "tests" && (
              <pre className="text-left text-indigo-300 whitespace-pre-wrap break-all select-text selection:bg-indigo-500/30 bg-[#07090f] p-3 rounded-lg border border-white/4">
                {execData.test_code || "No test cases generated."}
              </pre>
            )}

            {/* View C: AUDIT */}
            {activeSubTab === "audit" && (
              <div className="text-left text-gray-300 workspace-markdown select-text selection:bg-indigo-500/30 bg-[#07090f] p-4 rounded-lg border border-white/4 leading-relaxed font-mono">
                <ReactMarkdown
                  components={{
                    p({ children }) {
                      return <p className="mb-2 last:mb-0 text-gray-300">{children}</p>;
                    },
                    li({ children }) {
                      return <li className="text-gray-300 mb-1 leading-normal list-disc pl-1 ml-4">{children}</li>;
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
