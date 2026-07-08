import { useState } from "react";
import { Download, Check } from "lucide-react";

export default function ExportManager() {
  const [exportFormat, setExportFormat] = useState<string>("markdown");
  const [copied, setCopied] = useState<boolean>(false);

  const triggerExport = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider">Export Targets & Formats</h3>
        <p className="text-[10px] text-muted font-sans">Save code segments or summaries files locally.</p>
      </div>

      <div className="space-y-3">
        <div className="flex bg-panel border border-border p-1 rounded-xl shadow-inner">
          {[
            { id: "pdf", label: "PDF Document" },
            { id: "markdown", label: "Markdown (.md)" },
            { id: "json", label: "JSON Data" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setExportFormat(btn.id)}
              className={`flex-1 py-1 rounded-lg text-[9.5px] font-mono font-bold transition-all cursor-pointer ${
                exportFormat === btn.id ? "bg-accent-dim/15 text-accent border border-accent/20" : "text-muted hover:text-text-strong"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <button
          onClick={triggerExport}
          className="w-full py-1.5 bg-panel hover:bg-panel-alt border border-border text-text hover:text-text-strong rounded-lg text-[10px] font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-success" /> Export Completed
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-accent" /> Save Code/Summary
            </>
          )}
        </button>
      </div>
    </div>
  );
}
