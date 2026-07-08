interface DiffViewerProps {
  diffText: string;
  filename: string | null;
}

export default function DiffViewer({ diffText, filename }: DiffViewerProps) {
  if (!diffText || !diffText.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-xs font-mono select-none">
        No modifications or empty diff.
      </div>
    );
  }

  const lines = diffText.split("\n");

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-bg overflow-hidden border border-border rounded-xl">
      {filename && (
        <div className="flex items-center px-4 py-2 bg-panel border-b border-border shrink-0 select-none">
          <span className="text-[10px] font-mono font-bold text-text-strong">
            📄 {filename.split(/[\\/]/).pop()} (Unified Diff)
          </span>
        </div>
      )}
      <div className="flex-grow overflow-auto p-4 scrollbar-thin font-mono text-[11px] leading-relaxed select-text selection:bg-accent/30 bg-bg">
        <pre className="inline-block min-w-full">
          {lines.map((line, idx) => {
            let className = "text-muted";
            let bgClass = "";

            if (line.startsWith("+") && !line.startsWith("+++")) {
              className = "text-success";
              bgClass = "bg-success-bg/25 px-2 rounded-sm border-l-2 border-success/40";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              className = "text-danger";
              bgClass = "bg-danger-bg/25 px-2 rounded-sm border-l-2 border-danger/40";
            } else if (line.startsWith("@@")) {
              className = "text-secondary font-semibold";
              bgClass = "bg-secondary-dim/5 px-2 rounded-sm";
            } else if (line.startsWith("diff --git") || line.startsWith("index ")) {
              className = "text-accent font-bold";
              bgClass = "bg-panel px-2";
            } else if (line.startsWith("---") || line.startsWith("+++")) {
              className = "text-muted font-semibold";
            }

            return (
              <div key={idx} className={`${className} ${bgClass} py-0.5 whitespace-pre-wrap break-all`}>
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
