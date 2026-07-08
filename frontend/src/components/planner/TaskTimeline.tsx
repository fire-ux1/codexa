export interface TaskItem {
  id: string | number;
  file: string;
  action: string;
  instruction: string;
  complexity: string;
  status: "todo" | "running" | "ready" | "completed" | "failed";
}

interface TaskTimelineProps {
  tasks: TaskItem[];
  activeTaskId: string | number | null | undefined;
  onSelectTask: (task: TaskItem) => void;
}

export default function TaskTimeline({ tasks = [], activeTaskId, onSelectTask }: TaskTimelineProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-xs font-mono select-none">
        No planned tasks.
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="text-success">✓</span>;
      case "running":
        return <span className="w-2.5 h-2.5 border border-accent/25 border-t-accent rounded-full animate-spin shrink-0" />;
      case "failed":
        return <span className="text-danger">✕</span>;
      default:
        return <span className="text-muted">○</span>;
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case "completed":
        return "border-success/20 bg-success-bg/5 hover:border-success/30";
      case "running":
        return "border-accent bg-accent-dim/5";
      case "failed":
        return "border-danger/20 bg-danger-bg/5 hover:border-danger/30";
      default:
        return "border-border hover:border-border-strong hover:bg-panel-alt";
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-bg">
      {/* Title */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-border bg-panel select-none">
        <span className="text-[9px] font-bold text-muted font-mono uppercase tracking-widest">
          Planned Tasks Checklist ({tasks.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {tasks.map((task, idx) => {
          const isActive = activeTaskId === task.id;
          const status = task.status || "todo";

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask && onSelectTask(task)}
              className={`p-3 border rounded-xl cursor-pointer text-left transition-all ${getStatusBorder(status)} ${
                isActive ? "ring-1 ring-accent/40" : ""
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Status Indicator */}
                <div className="w-4 h-4 rounded-full flex items-center justify-center bg-panel border border-border font-mono text-[9px] font-bold shrink-0 mt-0.5 select-none">
                  {getStatusIcon(status)}
                </div>

                {/* Task Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-text-strong truncate">
                      {idx + 1}. {task.file.split(/[/\\]/).pop()}
                    </span>
                    <span className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                      task.action === "NEW" ? "bg-success-bg/10 text-success border border-success/20" : "bg-accent-dim/10 text-accent border border-accent/20"
                    }`}>
                      {task.action}
                    </span>
                  </div>

                  <p className="text-[10px] text-text leading-relaxed truncate-2-lines">
                    {task.instruction}
                  </p>

                  <div className="flex items-center gap-2 text-[8px] font-mono text-muted select-none pt-1">
                    <span>File: {task.file}</span>
                    <span>·</span>
                    <span className="capitalize">{task.complexity} Complexity</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
