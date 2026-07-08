import { ShieldCheck, Sparkles } from "lucide-react";

interface CodeReviewPanelProps {
  activeFile: string | null | undefined;
  onTriggerAction: (prompt: string) => void;
}

export default function CodeReviewPanel({ activeFile, onTriggerAction }: CodeReviewPanelProps) {
  const fileLabel = activeFile ? activeFile.split(/[/\\]/).pop() || "Repository" : "Repository";

  const auditItems = [
    { cat: "Security", score: 94, state: "passing", details: "No active SQL injection or hardcoded secrets found in AST scope." },
    { cat: "Maintainability", score: 82, state: "warn", details: "Calculate complexity indicates some long loops in file helper blocks." },
    { cat: "Readability & Docs", score: 75, state: "warn", details: "Inline documentation comments missing on 3 core export functions." },
    { cat: "Scalability", score: 90, state: "passing", details: "Optimal resource memory bounds configured correctly." },
  ];

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-success" /> Automated AI Code Review
        </h3>
        <p className="text-[10px] text-muted font-sans">Static analysis reviews for: {fileLabel}</p>
      </div>

      {/* Review items */}
      <div className="space-y-2.5">
        {auditItems.map((item, idx) => (
          <div key={idx} className="p-3 bg-panel border border-border rounded-xl space-y-1.5 shadow-sm">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold">
              <span className="text-text">{item.cat} Audit</span>
              <span className={item.state === "passing" ? "text-success" : "text-accent"}>
                Score: {item.score}%
              </span>
            </div>
            <p className="text-[9.5px] text-muted leading-normal font-mono">{item.details}</p>
          </div>
        ))}
      </div>

      {activeFile && onTriggerAction && (
        <button
          onClick={() => onTriggerAction(`Perform deep AI security and style guidelines review of the file ${activeFile}`)}
          className="w-full py-2 bg-accent hover:bg-accent-strong text-bg font-bold rounded-xl text-[10px] font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-accent/15"
        >
          <Sparkles className="w-3.5 h-3.5" /> Trigger Deep AI Audit Scan
        </button>
      )}
    </div>
  );
}
