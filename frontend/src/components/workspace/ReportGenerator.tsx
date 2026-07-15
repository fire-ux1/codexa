import { useState, useEffect, useCallback } from "react";
import {
  Download,
  FileCode,
  CheckCircle,
  RefreshCw,
  FileClock,
  FileText,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  generateReport,
  fetchReportHistory,
  getReportDownloadUrl,
} from "../../services/api";

interface ReportRecord {
  id: string;
  repository_id: string;
  name: string;
  report_type: "pdf" | "markdown";
  file_size: number;
  created_at: string;
}

interface ReportGeneratorProps {
  repositoryId?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function ReportGenerator({ repositoryId }: ReportGeneratorProps) {
  const [generating, setGenerating] = useState<boolean>(false);
  const [reportType, setReportType] = useState<"pdf" | "markdown">("pdf");
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<ReportRecord | null>(null);

  const loadHistory = useCallback(async () => {
    if (!repositoryId) return;
    setHistoryLoading(true);
    try {
      const data = await fetchReportHistory(repositoryId);
      const mapped: ReportRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        repository_id: item.repository_id,
        name: item.name || `Report_${item.id.substring(0, 8)}.${item.report_type === "pdf" ? "pdf" : "md"}`,
        report_type: item.report_type as "pdf" | "markdown",
        file_size: item.file_size || 0,
        created_at: item.created_at,
      }));
      setHistory(mapped);
    } catch {
      // Silently fail — history is non-critical
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [repositoryId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleGenerate = async () => {
    if (!repositoryId) {
      setError("No repository selected. Please index a repository first.");
      return;
    }
    setGenerating(true);
    setSuccessReport(null);
    setError(null);
    try {
      const res = await generateReport(repositoryId, reportType);
      if (res?.report_id) {
        setSuccessReport({
          id: res.report_id,
          repository_id: repositoryId,
          name: `Compliance_${reportType.toUpperCase()}_Report`,
          report_type: reportType,
          file_size: 0,
          created_at: new Date().toISOString(),
        });
        await loadHistory();
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || "Failed to generate report. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      {/* Header */}
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <FileCode className="w-4 h-4 text-accent" />
          Compliance Report Builder
        </h3>
        <p className="text-[10px] text-muted font-sans mt-0.5">
          Generate PDF or Markdown audit reports for the indexed repository.
        </p>
      </div>

      {/* Generator Controls */}
      <div className="p-3 bg-panel border border-border rounded-xl space-y-3 shadow-sm">
        {/* Format Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted font-mono uppercase tracking-wider">Format:</span>
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setReportType("pdf")}
              className={`px-3 py-1 text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                reportType === "pdf"
                  ? "bg-accent text-bg"
                  : "bg-panel-alt text-muted hover:text-text-strong"
              }`}
            >
              PDF
            </button>
            <button
              onClick={() => setReportType("markdown")}
              className={`px-3 py-1 text-[10px] font-mono font-bold transition-colors cursor-pointer border-l border-border ${
                reportType === "markdown"
                  ? "bg-accent text-bg"
                  : "bg-panel-alt text-muted hover:text-text-strong"
              }`}
            >
              Markdown
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !repositoryId}
          className="w-full py-1.5 bg-accent hover:bg-accent-strong disabled:bg-accent/40 disabled:cursor-not-allowed text-bg font-bold rounded-lg text-[10px] font-mono transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Compiling Report…
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" />
              Generate {reportType.toUpperCase()} Report
            </>
          )}
        </button>

        {/* Success Banner */}
        {successReport && (
          <div className="p-2.5 rounded bg-success-bg/15 border border-success/35 text-success text-[9.5px] flex items-center justify-between gap-3">
            <span className="font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Report Ready — {successReport.name}
            </span>
            <a
              href={getReportDownloadUrl(successReport.id)}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-0.5 rounded bg-success text-bg font-bold flex items-center gap-1 hover:bg-success-strong transition-colors cursor-pointer font-mono text-[9px]"
            >
              <Download className="w-3 h-3" />
              Download
            </a>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-2.5 rounded bg-danger-bg/15 border border-danger/30 text-danger text-[9.5px] flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!repositoryId && !error && (
          <p className="text-[9.5px] text-muted text-center italic">
            Index a repository to enable report generation.
          </p>
        )}
      </div>

      {/* History Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-text-strong flex items-center gap-1">
            <FileClock className="w-3.5 h-3.5 text-accent" />
            Report History
          </span>
          <button
            onClick={loadHistory}
            disabled={historyLoading || !repositoryId}
            className="text-[9px] text-muted hover:text-accent cursor-pointer transition-colors disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 ${historyLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-4 text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-[9.5px] text-muted text-center italic py-3">
            {repositoryId ? "No reports generated yet." : "Select a repository to see history."}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin">
            {history.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 rounded-lg bg-panel border border-border hover:border-accent/40 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] font-mono text-text-strong truncate">{r.name}</p>
                  <p className="text-[8.5px] text-muted mt-0.5">
                    {r.report_type.toUpperCase()} · {formatBytes(r.file_size)} · {formatDate(r.created_at)}
                  </p>
                </div>
                <a
                  href={getReportDownloadUrl(r.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 shrink-0 p-1.5 rounded bg-panel-alt hover:bg-accent text-muted hover:text-bg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Download report"
                >
                  <Download className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
