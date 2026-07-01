import { useState, useEffect, useCallback } from "react";
import { fetchRepositoryAnalytics } from "../services/api";
import { IconDatabase } from "../components/icons/Icons";

export default function RepositoryAnalyticsTab({ repoPath }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const metrics = await fetchRepositoryAnalytics(repoPath);
      setData(metrics);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load codebase analytics.");
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAnalytics();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAnalytics]);

  // Determine language colors
  const getLanguageColor = (lang) => {
    const colors = {
      ".py": "#3776AB",
      ".js": "#F7DF1E",
      ".jsx": "#61DAFB",
      ".ts": "#3178C6",
      ".tsx": "#3178C6",
      ".html": "#E34F26",
      ".css": "#1572B6",
      ".json": "#8F8F8F",
    };
    return colors[lang.toLowerCase()] || "#6366F1";
  };

  // Helper for bytes formatting
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in w-full py-12">
        <div className="text-center space-y-4">
          <span className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin inline-block"></span>
          <p className="text-gray-400 font-medium text-sm animate-pulse">Analyzing repository structure, parsing function declarations, and calculating complexity metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in w-full py-12 text-center">
        <div className="p-6 max-w-md mx-auto rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-4">
          <h3 className="text-sm font-semibold text-rose-400">Analysis Failed</h3>
          <p className="text-xs text-gray-400 font-mono leading-relaxed">{error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-all"
          >
            Retry Analytics
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-24 text-center text-gray-500 space-y-4 w-full">
        <IconDatabase className="w-12 h-12 mx-auto text-gray-600 opacity-60" />
        <p className="text-sm">Codebase analytics not computed yet.</p>
        <button
          onClick={loadAnalytics}
          className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
        >
          Compute Analytics
        </button>
      </div>
    );
  }

  // Find max files count for relative bar widths
  const totalLangFiles = data.languages.reduce((acc, curr) => acc + curr.files, 0);

  // Find max sizes for relative file/folder bar widths
  const maxFileSize = Math.max(...data.largest_files.map((f) => f.size), 1);
  const maxFolderSize = Math.max(...data.largest_folders.map((f) => f.size), 1);

  return (
    <div className="space-y-8 animate-fade-in w-full text-left">
      {/* Header */}
      <div className="border-b border-white/5 pb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <IconDatabase className="w-5 h-5 text-indigo-400" /> Repository Analytics
          </h2>
          <p className="mt-1 text-xs text-soft leading-relaxed">
            Detailed static statistics, complexity benchmarks, and architecture metrics.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="px-3.5 py-2 text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg transition-all"
        >
          Refresh Statistics
        </button>
      </div>

      {/* Grid of Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Repository Health */}
        <div className="p-5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Repository Health</span>
            <span className="text-2xl font-extrabold text-white font-mono block mt-1">{data.repository_health}%</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <span className="text-indigo-400 font-bold text-xs">🚀</span>
          </div>
        </div>

        {/* Total Code Volume */}
        <div className="p-5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Files &amp; Languages</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{data.files_indexed}</span>
              <span className="text-gray-500 text-xs font-medium">files</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <span className="text-violet-400 font-bold text-xs">📂</span>
          </div>
        </div>

        {/* Declarations (Classes & Functions) */}
        <div className="p-5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Functions &amp; Classes</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{data.functions}</span>
              <span className="text-gray-500 text-[10px] font-mono">f() / {data.classes} c</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 font-bold text-xs">λ</span>
          </div>
        </div>

        {/* Imports & Dependencies */}
        <div className="p-5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Dependencies &amp; Imports</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{data.dependency_count}</span>
              <span className="text-gray-500 text-[10px] font-mono">dep / {data.imports} imp</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 font-bold text-xs">📦</span>
          </div>
        </div>
      </div>

      {/* Two-Column Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Code Structure & Complexity Distribution */}
        <div className="space-y-6">
          
          {/* Language Distribution Card */}
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Language Distribution</h3>
            
            {/* Horizontal Stacked Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-800">
              {data.languages.map((lang) => {
                const pct = ((lang.files / totalLangFiles) * 100).toFixed(1);
                return (
                  <div
                    key={lang.language}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: getLanguageColor(lang.language),
                    }}
                    title={`${lang.language}: ${lang.files} files (${pct}%)`}
                  />
                );
              })}
            </div>

            {/* List with detail lines */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {data.languages.map((lang) => {
                const pct = ((lang.files / totalLangFiles) * 100).toFixed(1);
                return (
                  <div key={lang.language} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getLanguageColor(lang.language) }}
                      />
                      <span className="font-mono text-gray-300">{lang.language}</span>
                    </div>
                    <span className="text-gray-500 font-mono">{lang.files} files ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complexity Distribution Card */}
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Cyclomatic Complexity</h3>
              <div className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                Avg: {data.cyclomatic_complexity} / fn
              </div>
            </div>

            <div className="space-y-3.5">
              {data.complexity_histogram.map((hist) => {
                const total = data.complexity_histogram.reduce((acc, c) => acc + c.count, 0) || 1;
                const pct = ((hist.count / total) * 100).toFixed(1);
                let barColor = "bg-emerald-500";
                if (hist.range.includes("Moderate")) barColor = "bg-amber-500";
                if (hist.range.includes("Complex")) barColor = "bg-rose-500";
                
                return (
                  <div key={hist.range} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">{hist.range}</span>
                      <span className="text-gray-200">{hist.count} functions ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/5 text-[10px] text-gray-500 leading-relaxed font-mono">
              💡 Average Function Length is <span className="text-gray-300 font-semibold">{data.average_function_length} LOC</span>. Lower cyclomatic complexity and smaller function sizes ensure maintainable and testable components.
            </div>
          </div>

        </div>

        {/* Right Column: Codebase Hotspots / Sizes */}
        <div className="space-y-6">
          
          {/* Largest Files Card */}
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Largest Files (By Size)</h3>
            <div className="space-y-3 font-mono">
              {data.largest_files.map((file, idx) => {
                const widthPct = ((file.size / maxFileSize) * 100).toFixed(1);
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 truncate max-w-[240px] hover:text-white transition-colors" title={file.path}>
                        📄 {file.name}
                      </span>
                      <span className="text-gray-500 text-[10px] shrink-0">
                        {file.lines} LOC ({formatBytes(file.size)})
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: getLanguageColor(file.extension),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Largest Folders Card */}
          <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">Largest Folders</h3>
            <div className="space-y-3 font-mono">
              {data.largest_folders.map((folder, idx) => {
                const widthPct = ((folder.size / maxFolderSize) * 100).toFixed(1);
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 truncate max-w-[240px] hover:text-white transition-colors" title={folder.path}>
                        📁 {folder.path}
                      </span>
                      <span className="text-gray-500 text-[10px] shrink-0">
                        {folder.count} files ({formatBytes(folder.size)})
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
