import React, { useState } from "react";
import { createImplementationPlan, executePlanStep } from "../../services/planner";
import { commitPatch } from "../../services/patch";
import TaskTimeline, { TaskItem } from "./TaskTimeline";
import ExecutionPanel from "./ExecutionPanel";

interface PlannerWorkspaceProps {
  repoPath: string;
}

interface PlanData {
  summary: string;
  complexity: string;
  estimated_hours: number | string;
  tasks: TaskItem[];
  risks?: string[];
}

export default function PlannerWorkspace({ repoPath }: PlannerWorkspaceProps) {
  const [requestText, setRequestText] = useState<string>("");
  const [isPlanning, setIsPlanning] = useState<boolean>(false);

  // Plan data
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  // Execution states
  const [execResults, setExecResults] = useState<Record<string | number, any>>({});
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);

  const handleGeneratePlan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = requestText.trim();
    if (!query || isPlanning) return;

    setIsPlanning(true);
    setPlan(null);
    setActiveTask(null);
    setExecResults({});

    try {
      const res = await createImplementationPlan(repoPath, query);
      if (res && res.tasks) {
        res.tasks = (res.tasks as any[]).map((t) => ({ ...t, status: "todo" }));
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

  const handleExecuteTaskStep = async (task: TaskItem) => {
    setIsExecuting(true);
    setPlan((prev) => {
      if (!prev) return prev;
      const updatedTasks = prev.tasks.map((t) =>
        t.id === task.id ? { ...t, status: "running" as const } : t
      );
      return { ...prev, tasks: updatedTasks };
    });

    try {
      const outcome = await executePlanStep(repoPath, task.file, task.action, task.instruction);
      setExecResults((prev) => ({ ...prev, [task.id]: outcome }));
      
      setPlan((prev) => {
        if (!prev) return prev;
        const updatedTasks = prev.tasks.map((t) =>
          t.id === task.id ? { ...t, status: "ready" as const } : t
        );
        return { ...prev, tasks: updatedTasks };
      });
    } catch (err) {
      console.error("[PlannerWorkspace] Execute task error:", err);
      setPlan((prev) => {
        if (!prev) return prev;
        const updatedTasks = prev.tasks.map((t) =>
          t.id === task.id ? { ...t, status: "failed" as const } : t
        );
        return { ...prev, tasks: updatedTasks };
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApplyTaskPatch = async (task: TaskItem, updatedContent: string) => {
    setIsApplying(true);
    try {
      const res = await commitPatch(task.file, updatedContent);
      if (res.status === "success") {
        setPlan((prev) => {
          if (!prev) return prev;
          const updatedTasks = prev.tasks.map((t) =>
            t.id === task.id ? { ...t, status: "completed" as const } : t
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

  const handleUndoTaskPatch = async (task: TaskItem, originalContent: string) => {
    setIsUndoing(true);
    try {
      const res = await commitPatch(task.file, originalContent);
      if (res.status === "success") {
        setPlan((prev) => {
          if (!prev) return prev;
          const updatedTasks = prev.tasks.map((t) =>
            t.id === task.id ? { ...t, status: "ready" as const } : t
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
      <div className="flex items-center justify-center h-full text-muted text-xs font-mono select-none">
        Open a repository in explorer to use the Autonomous planner.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-bg text-text">
      
      {/* Search/Query box */}
      <form onSubmit={handleGeneratePlan} className="p-3 bg-panel border-b border-border shrink-0 select-none">
        <div className="flex gap-2">
          <input
            type="text"
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Describe a feature or bugfix to plan (e.g. Add validation to users API)..."
            disabled={isPlanning}
            className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-[11px] text-text-strong placeholder-muted font-mono outline-none focus:border-accent/40 focus:bg-accent-dim/10 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPlanning || !requestText.trim()}
            className="px-3.5 py-2 text-[10px] font-mono font-bold rounded-lg bg-accent text-bg hover:bg-accent-strong disabled:opacity-30 transition-all shrink-0 cursor-pointer"
          >
            {isPlanning ? "Planning..." : "Create Plan"}
          </button>
        </div>
      </form>

      {/* Main Workspace Frame */}
      {!plan ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 select-none bg-bg">
          {isPlanning ? (
            <>
              <span className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin shrink-0" />
              <span className="text-[10px] text-accent font-mono tracking-widest uppercase animate-pulse">
                Autonomous planner decomposing request into files and tasks...
              </span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-accent-dim/10 border border-accent/20 flex items-center justify-center">
                <span className="text-accent text-xl">📋</span>
              </div>
              <div className="space-y-1">
                <p className="text-text-strong font-semibold text-xs">Autonomous Task Planner Workspace</p>
                <p className="text-muted text-[10px] leading-relaxed max-w-sm font-sans">
                  Outline any custom product specifications. The planner will build structural task sequences, write code files, generate test scripts, and complete code audits.
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-grow flex-1 flex flex-col min-h-0 overflow-hidden bg-bg">
          
          {/* Top panel timeline checklist */}
          <div className="h-[200px] border-b border-border flex flex-col shrink-0 min-h-0 overflow-hidden w-full bg-bg">
            
            {/* Overview Card */}
            <div className="p-3 bg-panel-alt border-b border-border select-none space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold uppercase text-muted tracking-wider">
                  Plan Overview
                </span>
                <span className="text-[8px] font-mono font-bold bg-accent-dim/10 text-accent px-1.5 py-0.5 rounded uppercase border border-accent/20">
                  Complexity: {plan.complexity}
                </span>
              </div>
              <p className="text-[10px] text-text leading-normal text-left font-body">
                {plan.summary}
              </p>
              <div className="flex items-center justify-between text-[8px] font-mono text-muted pt-1">
                <span>Estimated Time: {plan.estimated_hours}h</span>
                <span>Risks Identified: {plan.risks?.length || 0}</span>
              </div>
            </div>

            {/* Tasks list */}
            <div className="flex-grow flex-1 min-h-0">
              <TaskTimeline
                tasks={plan.tasks}
                activeTaskId={activeTask?.id}
                onSelectTask={setActiveTask}
              />
            </div>

          </div>

          {/* Bottom panel execution viewer */}
          <div className="flex-grow flex-1 min-h-0 h-full overflow-hidden w-full bg-bg p-3">
            <ExecutionPanel
              task={activeTask}
              execData={execResults[activeTask?.id || ""]}
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
