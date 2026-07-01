export default function TaskTimeline({ tasks = [], activeTaskId, onSelectTask }) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono select-none">
        No planned tasks.
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <span className="text-emerald-400">✓</span>;
      case "running":
        return <span className="w-2.5 h-2.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin shrink-0" />;
      case "failed":
        return <span className="text-rose-400">✕</span>;
      default:
        return <span className="text-gray-600">○</span>;
    }
  };

  const getStatusBorder = (status) => {
    switch (status) {
      case "completed":
        return "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30";
      case "running":
        return "border-indigo-500 bg-indigo-500/5";
      case "failed":
        return "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/30";
      default:
        return "border-white/5 hover:border-white/10 hover:bg-white/3";
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#07090f]">
      {/* Title */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-white/5 bg-[#090c14] select-none">
        <span className="text-[9px] font-bold text-gray-500 font-mono uppercase tracking-widest">
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
                isActive ? "ring-1 ring-indigo-500/40" : ""
              }`}
            >
              <div className="flex items-start gap-2.5">
                {/* Status Indicator */}
                <div className="w-4 h-4 rounded-full flex items-center justify-center bg-black/20 border border-white/5 font-mono text-[9px] font-bold shrink-0 mt-0.5 select-none">
                  {getStatusIcon(status)}
                </div>

                {/* Task Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-gray-300 truncate">
                      {idx + 1}. {task.file.split(/[/\\]/).pop()}
                    </span>
                    <span className={`px-1 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                      task.action === "NEW" ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20" : "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                    }`}>
                      {task.action}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-400 leading-relaxed truncate-2-lines">
                    {task.instruction}
                  </p>

                  <div className="flex items-center gap-2 text-[8px] font-mono text-gray-500 select-none pt-1">
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
