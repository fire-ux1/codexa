// @ts-nocheck
import { useState } from "react";
import { Eye, EyeOff, LayoutGrid, Zap } from "lucide-react";

export default function LayoutManager() {
  const [showExplorer, setShowExplorer] = useState(() => {
    return localStorage.getItem("layout-show-explorer") !== "false";
  });
  const [showAIHelper, setShowAIHelper] = useState(() => {
    return localStorage.getItem("layout-show-ai") !== "false";
  });
  const [editorSplit, setEditorSplit] = useState(() => {
    return localStorage.getItem("layout-editor-split") || "single"; // single | split-h | split-v
  });
  const [zenMode, setZenMode] = useState(() => {
    return localStorage.getItem("layout-zen-mode") === "true";
  });

  const updatePreference = (key, val, setter) => {
    setter(val);
    localStorage.setItem(key, String(val));
    // Apply configurations dynamically
    if (key === "layout-zen-mode") {
      const workspace = document.querySelector(".workspace-container");
      if (workspace) {
        if (val) {
          workspace.classList.add("zen-mode-active");
        } else {
          workspace.classList.remove("zen-mode-active");
        }
      }
    }
  };

  return (
    <div className="space-y-4 select-none text-left">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Workspace Panel Layout</h3>
        <p className="text-[10px] text-gray-500">Configure sizing, splits, and Zen productivity states.</p>
      </div>

      <div className="space-y-3.5">
        {/* Toggle options */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">Visible Subpanels</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updatePreference("layout-show-explorer", !showExplorer, setShowExplorer)}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-[10px] font-mono font-bold ${
                showExplorer
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                  : "bg-[#141822] border-[#1c2230] text-gray-500"
              }`}
            >
              <span>File Explorer</span>
              {showExplorer ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => updatePreference("layout-show-ai", !showAIHelper, setShowAIHelper)}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-[10px] font-mono font-bold ${
                showAIHelper
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                  : "bg-[#141822] border-[#1c2230] text-gray-500"
              }`}
            >
              <span>AI Chat Assistant</span>
              {showAIHelper ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Editor splitting */}
        <div className="space-y-1.5 pt-2">
          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono flex items-center gap-1">
            <LayoutGrid className="w-3 h-3 text-indigo-400" /> Editor Split Mode
          </span>
          <div className="flex bg-[#0c0f16] border border-[#1c2230] p-1 rounded-xl">
            {[
              { id: "single", label: "Single View" },
              { id: "split-h", label: "Split Horizontal" },
              { id: "split-v", label: "Split Vertical" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => updatePreference("layout-editor-split", btn.id, setEditorSplit)}
                className={`flex-1 py-1 rounded-lg text-[9.5px] font-mono font-bold transition-all cursor-pointer ${
                  editorSplit === btn.id ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zen Mode */}
        <div className="pt-2 border-t border-[#1c2230]/40">
          <button
            onClick={() => updatePreference("layout-zen-mode", !zenMode, setZenMode)}
            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              zenMode
                ? "bg-purple-600/10 border-purple-500/40 text-purple-400 shadow-md shadow-purple-500/5 animate-pulse"
                : "bg-[#141822] border-[#1c2230] text-gray-400 hover:text-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 text-left">
              <span className="text-lg">ðŸ§˜</span>
              <div>
                <span className="text-[10px] font-bold font-sans block">Zen Focus Productivity Mode</span>
                <span className="text-[8.5px] text-gray-500 font-mono">Hides sidebars, docks, and notifications.</span>
              </div>
            </div>
            <Zap className={`w-4 h-4 ${zenMode ? 'text-purple-400 fill-purple-400/20' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

