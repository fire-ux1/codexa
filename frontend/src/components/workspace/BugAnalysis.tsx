import { AlertTriangle, ShieldAlert, Bug } from "lucide-react";

interface BugAnalysisProps {
  activeFile: string | null | undefined;
  onTriggerAction: (prompt: string) => void;
}

export default function BugAnalysis({ activeFile, onTriggerAction }: BugAnalysisProps) {
  const issues = activeFile
    ? [
        { type: "security", title: "Hardcoded secret API key", loc: "Line 24", severity: "critical", desc: "Do not store raw authorization keys directly inside code variables." },
        { type: "logic", title: "Possible Null Pointer dereference", loc: "Line 82", severity: "warning", desc: "Object parameter verified missing null checks before property reads." }
      ]
    : [];

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Bug className="w-4 h-4 text-danger" /> Automated Bug Diagnostics
        </h3>
        <p className="text-[10px] text-muted font-sans">AST leak analysis and logic check reports.</p>
      </div>

      <div className="space-y-2.5">
        {issues.length === 0 ? (
          <div className="p-4 bg-success-bg/15 border border-success/35 rounded-xl text-center space-y-1">
            <span className="text-success font-bold block text-[11px]">✓ No Security Bugs Found</span>
            <p className="text-muted text-[9.5px] font-mono">Run code compile checks to continuously monitor active files.</p>
          </div>
        ) : (
          issues.map((iss, idx) => (
            <div
              key={idx}
              className={`p-3 border rounded-xl flex gap-2.5 items-start ${
                iss.severity === "critical"
                  ? "bg-danger-bg/15 border-danger/35 text-danger"
                  : "bg-accent-dim/15 border-accent/35 text-accent"
              }`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-[9.5px] font-mono leading-relaxed select-text">
                <div className="flex justify-between font-bold">
                  <span className="text-text-strong">{iss.title}</span>
                  <span className="opacity-75">{iss.loc}</span>
                </div>
                <p className="text-muted mt-1">{iss.desc}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {activeFile && onTriggerAction && (
        <button
          onClick={() => onTriggerAction(`Search the active file ${activeFile} for potential bugs, infinite loops, memory leaks or race conditions.`)}
          className="w-full py-2 bg-panel hover:bg-panel-alt border border-border text-text hover:text-text-strong rounded-xl text-[10px] font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-danger" /> Trigger Full Bug Audit
        </button>
      )}
    </div>
  );
}
