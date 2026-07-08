import { useState } from "react";
import { Download, FileCode, CheckCircle, RefreshCw } from "lucide-react";

export default function ReportGenerator() {
  const [generating, setGenerating] = useState<boolean>(false);
  const [reportReady, setReportReady] = useState<boolean>(false);

  const generateReport = () => {
    setGenerating(true);
    setReportReady(false);
    setTimeout(() => {
      setGenerating(false);
      setReportReady(true);
    }, 2000);
  };

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <FileCode className="w-4 h-4 text-accent" /> AI Workspace Report Builder
        </h3>
        <p className="text-[10px] text-muted font-sans">Compile detailed PDF/Markdown audit sheets.</p>
      </div>

      <div className="p-3 bg-panel border border-border rounded-xl space-y-3 shadow-sm">
        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full py-1.5 bg-accent hover:bg-accent-strong disabled:bg-accent/40 text-bg font-bold rounded-lg text-[10px] font-mono transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          {generating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling Report...
            </>
          ) : (
            "Generate Audit Report"
          )}
        </button>

        {reportReady && (
          <div className="p-2.5 rounded bg-success-bg/15 border border-success/35 text-success text-[9.5px] flex items-center justify-between gap-3">
            <span className="font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Workspace Audit Ready
            </span>
            <button className="px-2 py-0.5 rounded bg-success text-bg font-bold flex items-center gap-1 hover:bg-success-strong transition-colors cursor-pointer font-mono text-[9px]">
              <Download className="w-3 h-3" /> Get PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
