/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Sparkles, Play, Bookmark, Clock, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askQuestion } from "../services/api";

const STARTING_POINTS = [
  { label: "Authentication", query: "Explain how authentication is handled in this codebase." },
  { label: "API Layer", query: "Describe the REST API endpoint routing structure in this repository." },
  { label: "Database Models", query: "Show me the database models, tables, and connection structure." },
  { label: "Configuration", query: "List the configuration, environment settings, and setup files." },
  { label: "Routing & Entry", query: "Show the main entry points, app initialization, and URL routing paths." },
];

export default function OverviewTab({
  repoPath,
  metrics,
  onStartStartingPoint, // callback to trigger a search/chat query
  onOpenFile,
}) {
  const [aiSummary, setAiSummary] = useState(() => {
    return localStorage.getItem(`codepilot_summary_${repoPath}`) || "";
  });
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Auto-generate AI Repository Summary if missing
  useEffect(() => {
    if (!repoPath || aiSummary) return;
    setLoadingSummary(true);
    askQuestion(
      "Provide a concise technical summary of this repository. Write exactly four brief sections: 1. Core Purpose (what it does), 2. Main Technologies (frameworks used), 3. Main Entry Points (which files launch the app), and 4. High-level Architecture. Use clean Markdown styling.",
      repoPath
    )
      .then((res) => {
        if (res.answer) {
          setAiSummary(res.answer);
          localStorage.setItem(`codepilot_summary_${repoPath}`, res.answer);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch repository summary:", err);
      })
      .finally(() => setLoadingSummary(false));
  }, [repoPath, aiSummary]);

  // Load recent files and bookmarks from localStorage
  const [recentFiles, setRecentFiles] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    try {
      const open = JSON.parse(localStorage.getItem("codepilot_open_files") || "[]");
      setRecentFiles(open.slice(0, 4));
      
      const bmarks = JSON.parse(localStorage.getItem("codepilot_bookmarks") || "[]");
      setBookmarks(bmarks.slice(0, 4));
    } catch (e) {
      console.error("Failed to load local workspaces history:", e);
    }
  }, [repoPath]);

  const handleRefreshSummary = () => {
    setLoadingSummary(true);
    askQuestion(
      "Provide a concise technical summary of this repository. Write exactly four brief sections: 1. Core Purpose (what it does), 2. Main Technologies (frameworks used), 3. Main Entry Points (which files launch the app), and 4. High-level Architecture. Use clean Markdown styling.",
      repoPath
    )
      .then((res) => {
        if (res.answer) {
          setAiSummary(res.answer);
          localStorage.setItem(`codepilot_summary_${repoPath}`, res.answer);
        }
      })
      .catch((err) => {
        console.error("Failed to regenerate summary:", err);
      })
      .finally(() => setLoadingSummary(false));
  };

  return (
    <div className="space-y-8 animate-fade-in w-full max-w-4xl mx-auto py-6 px-4 pb-20 select-text">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
          <span>📂</span> {repoPath ? repoPath.split(/[/\\]/).pop() : "Repository Overview"}
        </h1>
        <p className="text-xs text-gray-500 font-mono mt-1 break-all">{repoPath}</p>
      </div>

      {/* AI Repository Summary Hero Section */}
      <div className="bg-[#141822] border border-[#1c2230] rounded-2xl p-5 space-y-3 relative shadow-md">
        <div className="flex items-center justify-between border-b border-[#1c2230] pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">AI Repository Intelligence Overview</h3>
          </div>
          <button
            onClick={handleRefreshSummary}
            disabled={loadingSummary}
            title="Regenerate Repository Summary"
            className="p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-[#1c2230] text-gray-500 hover:text-gray-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingSummary ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <span className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
            <p className="text-xs text-gray-500 font-mono">Synthesizing codebase layout and structure...</p>
          </div>
        ) : aiSummary ? (
          <div className="text-xs text-gray-300 leading-relaxed font-sans prose prose-invert max-w-none prose-xs">
            <ReactMarkdown>{aiSummary}</ReactMarkdown>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-500 font-mono italic">
            No summary generated. Click refresh above to generate an AI review.
          </div>
        )}
      </div>

      {/* Suggested Starting Points */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Suggested Starting Points</h4>
        <div className="flex flex-wrap gap-2.5">
          {STARTING_POINTS.map((point) => (
            <button
              key={point.label}
              onClick={() => onStartStartingPoint(point.query)}
              className="px-3.5 py-2.5 rounded-xl border border-[#1c2230] bg-[#141822] hover:bg-[#1b212f] text-gray-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-2"
            >
              <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
              <span>{point.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Continue Working grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Files */}
        <div className="bg-[#141822] border border-[#1c2230] rounded-2xl p-4.5 space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-[#1c2230] pb-2">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>Recent Files</span>
          </h4>
          <div className="space-y-1.5">
            {recentFiles.length === 0 ? (
              <p className="text-xs text-gray-600 italic py-2">No files opened recently.</p>
            ) : (
              recentFiles.map((f) => (
                <button
                  key={f}
                  onClick={() => onOpenFile(f)}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-gray-400 hover:text-white transition-all font-mono truncate block"
                >
                  📄 {f.split(/[/\\]/).pop()} <span className="text-[10px] text-gray-600 ml-2">{f}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bookmarked / Core Modules */}
        <div className="bg-[#141822] border border-[#1c2230] rounded-2xl p-4.5 space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-[#1c2230] pb-2">
            <Bookmark className="w-3.5 h-3.5 text-gray-500" />
            <span>Bookmarked Modules</span>
          </h4>
          <div className="space-y-1.5">
            {bookmarks.length === 0 ? (
              <div className="text-xs text-gray-600 italic py-2 space-y-1">
                <p>No bookmarks set.</p>
                <p className="text-[10px] opacity-75">Click the bookmark icon on any opened file to pin it here.</p>
              </div>
            ) : (
              bookmarks.map((f) => (
                <button
                  key={f}
                  onClick={() => onOpenFile(f)}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-gray-400 hover:text-white transition-all font-mono truncate block"
                >
                  ⭐ {f.split(/[/\\]/).pop()} <span className="text-[10px] text-gray-600 ml-2">{f}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Supporting Repository Statistics - Below the Fold */}
      <div className="border-t border-[#1c2230] pt-6 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Workspace Statistics</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#141822] border border-[#1c2230] rounded-xl text-center">
            <span className="text-[10px] text-gray-500 font-mono">Files Count</span>
            <span className="block text-lg font-bold text-white font-mono mt-0.5">{metrics.filesIndexed || 0}</span>
          </div>
          <div className="p-4 bg-[#141822] border border-[#1c2230] rounded-xl text-center">
            <span className="text-[10px] text-gray-500 font-mono">Symbols scope</span>
            <span className="block text-lg font-bold text-white font-mono mt-0.5">{metrics.chunksIndexed || 0}</span>
          </div>
          <div className="p-4 bg-[#141822] border border-[#1c2230] rounded-xl text-center">
            <span className="text-[10px] text-gray-500 font-mono">Indexing Status</span>
            <span className="block text-xs font-bold text-emerald-400 font-mono mt-2">READY</span>
          </div>
          <div className="p-4 bg-[#141822] border border-[#1c2230] rounded-xl text-center">
            <span className="text-[10px] text-gray-500 font-mono">Platform version</span>
            <span className="block text-lg font-bold text-white font-mono mt-0.5">v4.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
