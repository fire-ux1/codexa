import { IconFolder } from "../icons/Icons";

interface WorkspaceMetrics {
  filesIndexed: number;
  chunksIndexed: number;
  [key: string]: any;
}

interface WorkspaceInfoProps {
  repoPath: string;
  metrics: WorkspaceMetrics;
}

export default function WorkspaceInfo({ repoPath, metrics }: WorkspaceInfoProps) {
  return (
    <div className="p-5 rounded-2xl border border-border bg-panel/40 glass shadow-sm">
      <div className="flex items-center gap-2 mb-3.5">
        <IconFolder className="w-4 h-4 text-accent" />
        <h3 className="text-xs uppercase font-bold tracking-wider text-muted">Workspace Details</h3>
      </div>

      <div className="space-y-3 font-mono text-xs">
        <div>
          <span className="text-muted">Repository Path</span>
          <p className="text-text-strong break-all bg-bg p-2 rounded-lg mt-1 text-[11px] border border-border select-text">{repoPath}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-bg p-2.5 rounded-lg border border-border shadow-inner">
            <span className="text-[10px] text-muted block mb-0.5">Files Indexed</span>
            <span className="text-text-strong text-sm font-semibold">{metrics.filesIndexed}</span>
          </div>
          <div className="bg-bg p-2.5 rounded-lg border border-border shadow-inner">
            <span className="text-[10px] text-muted block mb-0.5">Code Symbols</span>
            <span className="text-text-strong text-sm font-semibold">{metrics.chunksIndexed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
