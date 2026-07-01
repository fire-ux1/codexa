import { useState } from "react";
import { createImplementationPlan, executePlanStep } from "../../services/planner";
import { commitPatch } from "../../services/patch";
import TaskTimeline from "./TaskTimeline";
import ExecutionPanel from "./ExecutionPanel";

export default function PlannerWorkspace({ repoPath }) {
  const [requestText, setRequestText] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);

  // Plan data
  const [plan, setPlan] = useState(null); // { summary, complexity, estimated_hours, tasks, risks }
  const [activeTask, setActiveTask] = useState(null);

  // Execution states
  const [execResults, setExecResults] = useState({}); // key: taskId, value: exec outcome
  const [isExecuting, setIsExecuting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const handleGeneratePlan = async (e) => {
    if (e) e.preventDefault();
    const query = requestText.trim();
    if (!query || isPlanning) return;

    setIsPlanning(true);
    setPlan(null);
    setActiveTask(null);
    setExecResults({});

    try {
      const res = await createImplementationPlan(repoPath, query);
      // Initialize task statuses to 'todo'
      if (res && res.tasks) {
        res.tasks = res.tasks.map((t) => ({ ...t, status: "todo" }));
        setPlan(res);
        if (res.tasks.length > 0) {
          setActiveTask(res.tasks[0]);
        }
      }
    } catch (err) {
      console.error("[PlannerWorkspace] Create plan error:", err);
    } finally {
      setIsPlanning(false);
    }
  };

  // Run code generation & tests for a planned task step
  const handleExecuteTaskStep = async (task) => {
    setIsExecuting(true);
    // Mark status running
    setPlan((prev) => {
      const updatedTasks = prev.tasks.map((t) =>
        t.id === task.id ? { ...t, status: "running" } : t
      );
      return { ...prev, tasks: updatedTasks };
    });

    try {
      const outcome = await executePlanStep(repoPath, task.file, task.action, task.instruction);
      setExecResults((prev) => ({ ...prev, [task.id]: outcome }));
      
      // Mark status as ready
      setPlan((prev) => {
        const updatedTasks = prev.tasks.map((t) =>
          t.id === task.id ? { ...t, status: "ready" } : t
        );
        return { ...prev, tasks: updatedTasks };
      });
    } catch (err) {
      console.error("[PlannerWorkspace] Execute task error:", err);
      // Mark status failed
      setPlan((prev) => {
        const updatedTasks = prev.tasks.map((t) =>
          t.id === task.id ? { ...t, status: "failed" } : t
        );
        return { ...prev, tasks: updatedTasks };
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Write changes to filesystem
  const handleApplyTaskPatch = async (task, updatedContent) => {
    setIsApplying(true);
    try {
      // Use Phase 20 commitPatch helper to write file to disk securely
      const res = await commitPatch(task.file, updatedContent, repoPath);
      if (res.status === "success") {
        // Mark status completed
        setPlan((prev) => {
          const updatedTasks = prev.tasks.map((t) =>
            t.id === task.id ? { ...t, status: "completed" } : t
          );
          return { ...prev, tasks: updatedTasks };
        });
      }
    } catch (err) {
      console.error("[PlannerWorkspace] Apply patch error:", err);
    } finally {
      setIsApplying(false);
    }
  };

  // Revert changes on filesystem
  const handleUndoTaskPatch = async (task, originalContent) => {
    setIsUndoing(true);
    try {
      const res = await commitPatch(task.file, originalContent, repoPath);
      if (res.status === "success") {
        // Revert status to ready
        setPlan((prev) => {
          const updatedTasks = prev.tasks.map((t) =>
            t.id === task.id ? { ...t, status: "ready" } : t
          );
          return { ...prev, tasks: updatedTasks };
        });
      }
    } catch (err) {
      console.error("[PlannerWorkspace] Revert patch error:", err);
    } finally {
      setIsUndoing(false);
    }
  };

  if (!repoPath) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono select-none">
        Open a repository in explorer to use the Autonomous planner.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#07090f] text-gray-300">
      
      {/* Search/Query box */}
      <form onSubmit={handleGeneratePlan} className="p-3 bg-[#090c14] border-b border-white/5 shrink-0 select-none">
        <div className="flex gap-2">
          <input
            type="text"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Describe a feature or bugfix to plan (e.g. Add validation to users API)..."
            disabled={isPlanning}
            className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[11px] text-gray-300 placeholder-gray-600 font-mono outline-none focus:border-violet-500/40 focus:bg-violet-500/5 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPlanning || !requestText.trim()}
            className="px-3.5 py-2 text-[10px] font-mono font-bold rounded-lg bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 disabled:opacity-30 transition-all shrink-0"
          >
            {isPlanning ? "Planning..." : "Create Plan"}
          </button>
        </div>
      </form>

      {/* Main Workspace Frame */}
      {!plan ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 select-none">
          {isPlanning ? (
            <>
              <span className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin shrink-0" />
              <span className="text-[10px] text-violet-400 font-mono tracking-widest uppercase animate-pulse">
                Autonomous planner decomposing request into files and tasks...
              </span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                <span className="text-violet-400 text-xl">📋</span>
              </div>
              <div className="space-y-1">
                <p className="text-white font-semibold text-xs">Autonomous Task Planner Workspace</p>
                <p className="text-gray-500 text-[10px] leading-relaxed max-w-sm">
                  Outline any custom product specifications. The planner will build structural task sequences, write code files, generate test scripts, and complete code audits.
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* Left panel timeline checklist */}
          <div className="w-[300px] border-r border-white/5 flex flex-col shrink-0 min-h-0 overflow-hidden">
            
            {/* Overview Card */}
            <div className="p-3 bg-white/3 border-b border-white/5 select-none space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                  Plan Overview
                </span>
                <span className="text-[8px] font-mono font-bold bg-violet-600/10 text-violet-400 px-1 py-0.5 rounded uppercase">
                  Complexity: {plan.complexity}
                </span>
              </div>
              <p className="text-[10px] text-gray-300 leading-normal text-left">
                {plan.summary}
              </p>
              <div className="flex items-center justify-between text-[8px] font-mono text-gray-500 pt-1">
                <span>Estimated Time: {plan.estimated_hours}h</span>
                <span>Risks Identified: {plan.risks?.length || 0}</span>
              </div>
            </div>

            {/* Tasks list */}
            <div className="flex-1 min-h-0">
              <TaskTimeline
                tasks={plan.tasks}
                activeTaskId={activeTask?.id}
                onSelectTask={setActiveTask}
              />
            </div>

          </div>

          {/* Right panel execution viewer */}
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            <ExecutionPanel
              task={activeTask}
              execData={execResults[activeTask?.id]}
              onExecuteTask={handleExecuteTaskStep}
              onApplyPatch={handleApplyTaskPatch}
              onUndoPatch={handleUndoTaskPatch}
              isExecuting={isExecuting}
              isApplying={isApplying}
              isUndoing={isUndoing}
            />
          </div>

        </div>
      )}

    </div>
  );
}
