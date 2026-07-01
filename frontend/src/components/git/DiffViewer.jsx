export default function DiffViewer({ diffText, filename }) {
  if (!diffText || !diffText.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono select-none">
        No modifications or empty diff.
      </div>
    );
  }

  const lines = diffText.split("\n");

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#06080e] overflow-hidden">
      {filename && (
        <div className="flex items-center px-4 py-2 bg-[#090c14] border-b border-white/5 shrink-0 select-none">
          <span className="text-[10px] font-mono font-bold text-gray-400">
            📄 {filename.split(/[\\/]/).pop()} (Unified Diff)
          </span>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 scrollbar-thin font-mono text-[11px] leading-relaxed select-text selection:bg-indigo-500/30">
        <pre className="inline-block min-w-full">
          {lines.map((line, idx) => {
            let className = "text-gray-400";
            let bgClass = "";

            if (line.startsWith("+") && !line.startsWith("+++")) {
              className = "text-emerald-400";
              bgClass = "bg-emerald-950/20 px-2 rounded-sm border-l-2 border-emerald-500/40";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              className = "text-rose-400";
              bgClass = "bg-rose-950/20 px-2 rounded-sm border-l-2 border-rose-500/40";
            } else if (line.startsWith("@@")) {
              className = "text-cyan-500 font-semibold";
              bgClass = "bg-cyan-950/5 px-2 rounded-sm";
            } else if (line.startsWith("diff --git") || line.startsWith("index ")) {
              className = "text-indigo-400 font-bold";
              bgClass = "bg-[#0b0f19] px-2";
            } else if (line.startsWith("---") || line.startsWith("+++")) {
              className = "text-gray-500 font-semibold";
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
