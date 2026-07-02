
export default function WorkspaceHeader({ repoPath, activeFile }) {
  const repoName = repoPath ? repoPath.split(/[\\/]/).pop() : "No Repository";
  const fileName = activeFile ? activeFile.split(/[\\/]/).pop() : null;

  return (
    <div className="flex items-center gap-3 px-4 h-10 bg-[#0c0f16] border-b border-[#1c2230] shrink-0 select-none">
      {/* Logo mark */}
      <div className="flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-[8px] font-black">CP</span>
        </div>
        <span className="text-[11px] font-bold text-indigo-400 font-mono tracking-wider">CodePilot AI</span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 ml-2">
        <span className="text-gray-400 font-semibold">{repoName}</span>
        {fileName && (
          <>
            <span className="text-gray-700">›</span>
            <span className="text-indigo-400">{fileName}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold font-mono uppercase tracking-wide">
          v4.1 Workspace
        </span>
      </div>
    </div>
  );
}
