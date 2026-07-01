import { DiffEditor } from "@monaco-editor/react";
import { getEditorLanguage } from "../../utils/editorLanguage";

export default function DiffViewer({ original, modified, filePath }) {
  const language = getEditorLanguage(filePath);

  if (!original && !modified) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm font-mono">
        No patch loaded yet.
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      {/* Diff labels */}
      <div className="flex shrink-0 border-b border-white/5 bg-[#0d1117]">
        <div className="flex-1 px-4 py-1.5 border-r border-white/5">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-rose-400">
            ← Original
          </span>
        </div>
        <div className="flex-1 px-4 py-1.5">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-400">
            Modified →
          </span>
        </div>
      </div>

      {/* Monaco Diff Editor */}
      <div className="flex-1 min-h-0">
        <DiffEditor
          height="100%"
          language={language}
          original={original || ""}
          modified={modified || ""}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            wordWrap: "on",
            fontSize: 12,
            fontFamily: "JetBrains Mono, Fira Code, Courier New, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderSideBySide: true,
            enableSplitViewResizing: true,
            originalEditable: false,
          }}
        />
      </div>
    </div>
  );
}
