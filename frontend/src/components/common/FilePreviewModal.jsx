import { useState, useRef, useEffect } from "react";
import MonacoFileViewer from "../editor/MonacoFileViewer";
import SymbolExplorer from "../symbols/SymbolExplorer";
import FormatText from "./FormatText";
import { getEditorLanguage } from "../../utils/editorLanguage";
import { IconCopy, IconCheck } from "../icons/Icons";
import { searchCodebase, fetchFileSymbols, runAIActionStream } from "../../services/api";

export default function FilePreviewModal({
  previewFile,
  previewContent,
  isPreviewLoading,
  onClose,
  initialLine,
  repoPath,
  onOpenFile,
  onExplainSymbolGlobal,
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("outline"); // "outline" or "actions" or "references"
  const [activePanel, setActivePanel] = useState("tab-view"); // "tab-view" or "action-result"
  
  // Find References States
  const [references, setReferences] = useState([]);
  const [refSearchWord, setRefSearchWord] = useState("");
  const [isRefLoading, setIsRefLoading] = useState(false);

  // AI Actions States
  const [actionResultText, setActionResultText] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeActionLabel, setActiveActionLabel] = useState("");
  const [isSelectionUsed, setIsSelectionUsed] = useState(false);
  const [copiedActionText, setCopiedActionText] = useState(false);

  const editorRef = useRef(null);

  // Jump to initial line when Monaco loads
  useEffect(() => {
    if (editorRef.current && initialLine) {
      setTimeout(() => {
        const editor = editorRef.current;
        if (editor) {
          editor.revealLineInCenter(initialLine);
          editor.setPosition({ lineNumber: initialLine, column: 1 });
          editor.focus();
        }
      }, 300);
    }
  }, [initialLine, isPreviewLoading]);

  if (!previewFile) return null;

  const handleCopyPath = () => {
    navigator.clipboard.writeText(previewFile);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageLabel = () => {
    const lang = getEditorLanguage(previewFile);
    return lang.toUpperCase();
  };

  const getByteSizeLabel = () => {
    if (!previewContent) return null;
    const bytes = new Blob([previewContent]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const sizeLabel = getByteSizeLabel();
  const languageLabel = getLanguageLabel();

  // Scroll to symbol definition
  const handleSelectSymbol = (symbol) => {
    const editor = editorRef.current;
    if (editor && symbol.line) {
      editor.revealLineInCenter(symbol.line);
      editor.setPosition({ lineNumber: symbol.line, column: symbol.column || 1 });
      editor.focus();
    }
  };

  // Custom Context Menu: Go To Definition
  const handleGoToDefinition = async (word) => {
    try {
      const searchRes = await searchCodebase(word, repoPath);
      const definition =
        searchRes.find(
          (res) =>
            res.symbol === word &&
            (res.type === "ClassDef" ||
              res.type === "FunctionDef" ||
              res.type === "AsyncFunctionDef")
        ) || searchRes[0];

      if (definition) {
        let line = 1;
        try {
          const syms = await fetchFileSymbols(definition.path);
          const found = syms.find((s) => s.name === word);
          if (found) line = found.line;
        } catch (err) {
          console.error(err);
        }
        onOpenFile(definition.path, line);
      }
    } catch (err) {
      console.error("Go to definition failed:", err);
    }
  };

  // Custom Context Menu: Find References
  const handleFindReferences = async (word) => {
    try {
      setIsRefLoading(true);
      setRefSearchWord(word);
      setActiveTab("references");
      setActivePanel("tab-view");

      const searchRes = await searchCodebase(word, repoPath);
      const grouped = {};
      searchRes.forEach((res) => {
        if (!grouped[res.path]) {
          grouped[res.path] = {
            path: res.path,
            file: res.file,
            snippets: [],
          };
        }
        grouped[res.path].snippets.push(res);
      });
      setReferences(Object.values(grouped));
    } catch (err) {
      console.error("Find references failed:", err);
    } finally {
      setIsRefLoading(false);
    }
  };

  // Helper to read highlighted selection in Monaco Editor
  const getMonacoSelection = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    const selection = editor.getSelection();
    if (!selection) return null;
    const value = editor.getModel()?.getValueInRange(selection);
    return value && value.trim() ? value : null;
  };

  // Trigger AI Action
  const handleRunAIAction = async (actionId, actionLabel) => {
    try {
      setActionResultText("");
      setActiveActionLabel(actionLabel);
      setActivePanel("action-result");
      setIsActionLoading(true);

      const selection = getMonacoSelection();
      setIsSelectionUsed(Boolean(selection));

      const response = await runAIActionStream({
        repo: repoPath,
        file: previewFile,
        action: actionId,
        selection: selection,
        stream: true,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processLines = (text) => {
        buffer += text;
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === "token") {
              setActionResultText((prev) => prev + parsed.token);
            } else if (parsed.type === "error") {
              setActionResultText((prev) => prev + `\nError: ${parsed.message}`);
            }
          } catch (err) {
            console.warn(err);
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (buffer.trim()) processLines("\n");
          break;
        }
        processLines(decoder.decode(value));
      }
    } catch (err) {
      console.error("Action execution failed:", err);
      setActionResultText(`Failed to execute action: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExplainSymbolLocal = (word) => {
    onExplainSymbolGlobal(word);
    onClose();
  };

  const handleCopyActionText = () => {
    navigator.clipboard.writeText(actionResultText);
    setCopiedActionText(true);
    setTimeout(() => setCopiedActionText(false), 2000);
  };

  // Breadcrumbs Generator
  const renderBreadcrumbs = () => {
    const relPath = previewFile
      .replace(repoPath || "", "")
      .replace(/\\/g, "/")
      .replace(/^\//, "");
    const parts = relPath.split("/");
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono overflow-x-auto whitespace-nowrap scrollbar-none py-1">
        {parts.map((part, index) => (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-gray-700">›</span>}
            <span className="hover:text-gray-300 transition-colors">{part}</span>
          </span>
        ))}
      </div>
    );
  };

  const actionsList = [
    { id: "explain", label: "Explain Code", desc: "Detailed walkthrough of structure and logic." },
    { id: "summarize", label: "Summarize File", desc: "High-level summary of file purpose and exports." },
    { id: "review", label: "Review Code", desc: "Scan for style violations and maintainability." },
    { id: "find_bugs", label: "Find Bugs", desc: "Analyze logic errors and edge cases." },
    { id: "security", label: "Security Scan", desc: "Identify vulnerabilities and insecure patterns." },
    { id: "refactor", label: "Suggest Refactoring", desc: "Propose cleaner code and DRY structures." },
    { id: "optimize", label: "Optimize Performance", desc: "Analyze complexity and resource bottlenecks." },
    { id: "generate_tests", label: "Generate Tests", desc: "Draft mock suites and test assertions." },
    { id: "generate_docs", label: "Generate Docs", desc: "Generate docstrings and file descriptions." },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-900/95 border border-white/10 rounded-3xl p-6 flex flex-col max-h-[85vh] shadow-2xl relative animate-fade-in glass">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono truncate">
                  {previewFile.split("/").pop() || previewFile}
                </h3>
                {languageLabel !== "PLAINTEXT" && (
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-mono tracking-wider shrink-0">
                    {languageLabel}
                  </span>
                )}
                {sizeLabel && (
                  <span className="px-2 py-0.5 text-[9px] font-medium rounded-md bg-white/5 text-gray-400 border border-white/5 font-mono shrink-0">
                    {sizeLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 min-w-0">
                {renderBreadcrumbs()}
                <button
                  onClick={handleCopyPath}
                  className="hover:text-white transition-all p-0.5 rounded hover:bg-white/5 text-gray-500 flex items-center justify-center shrink-0"
                  title="Copy File Path"
                >
                  {copied ? (
                    <IconCheck className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <IconCopy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-semibold shrink-0"
          >
            ✕ Close
          </button>
        </div>

        {/* Workspace Split Layout */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4 min-h-[380px] overflow-hidden">
          
          {/* Left Panel: Monaco Editor */}
          <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl p-1 overflow-hidden relative">
            <MonacoFileViewer
              filePath={previewFile}
              content={previewContent}
              loading={isPreviewLoading}
              editorRef={editorRef}
              onExplainSymbol={handleExplainSymbolLocal}
              onGoToDefinition={handleGoToDefinition}
              onFindReferences={handleFindReferences}
            />
          </div>

          {/* Right Panel: Outline / AI Actions Sidebar */}
          <div className="overflow-hidden flex flex-col h-full bg-slate-900/35 border border-white/5 rounded-2xl p-4 min-h-[380px]">
            
            {activePanel === "tab-view" ? (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Tab Switch Headers */}
                <div className="flex gap-1 p-1 bg-black/20 rounded-xl border border-white/5 mb-3 shrink-0">
                  <button
                    onClick={() => setActiveTab("outline")}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                      activeTab === "outline" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Outline
                  </button>
                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                      activeTab === "actions" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    AI Actions
                  </button>
                  {(references.length > 0 || isRefLoading) && (
                    <button
                      onClick={() => setActiveTab("references")}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                        activeTab === "references" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Refs ({references.length})
                    </button>
                  )}
                </div>

                {/* Tab Panel Contexts */}
                <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin">
                  {activeTab === "outline" && (
                    <SymbolExplorer
                      filePath={previewFile}
                      loading={isPreviewLoading}
                      onSelectSymbol={handleSelectSymbol}
                    />
                  )}

                  {activeTab === "actions" && (
                    <div className="space-y-3 pb-2">
                      <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-300 font-mono leading-relaxed">
                        💡 Highlight any selection inside Monaco to run an action specifically on that code segment.
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2.5">
                        {actionsList.map((act) => (
                          <button
                            key={act.id}
                            onClick={() => handleRunAIAction(act.id, act.label)}
                            className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all font-mono group"
                          >
                            <span className="text-[11px] font-bold text-gray-200 group-hover:text-indigo-400 transition-colors block">
                              {act.label}
                            </span>
                            <span className="text-[9px] text-gray-500 block mt-0.5 leading-snug">
                              {act.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "references" && (
                    <div className="space-y-4 select-none">
                      {isRefLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <span className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
                        </div>
                      ) : references.length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-2">No references found</p>
                      ) : (
                        <div className="space-y-4">
                          {references.map((group, gIdx) => (
                            <div key={gIdx} className="space-y-1">
                              <div
                                className="text-[10px] font-bold text-gray-400 font-mono truncate hover:text-white cursor-pointer"
                                title={group.path}
                                onClick={() => onOpenFile(group.path)}
                              >
                                📂 {group.file}
                              </div>
                              <div className="pl-2 space-y-1">
                                {group.snippets.map((snip, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={async () => {
                                      let targetLine = 1;
                                      try {
                                        const syms = await fetchFileSymbols(group.path);
                                        const found = syms.find((s) => s.name === refSearchWord);
                                        if (found) targetLine = found.line;
                                      } catch (err) {
                                        console.error(err);
                                      }
                                      onOpenFile(group.path, targetLine);
                                    }}
                                    className="w-full text-left p-1.5 rounded bg-white/5 hover:bg-white/10 text-[10px] font-mono text-gray-300 block truncate"
                                    title={snip.snippet}
                                  >
                                    {snip.snippet}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Action Result Panel */
              <div className="flex flex-col h-full overflow-hidden select-none">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/5 shrink-0">
                  <button
                    onClick={() => {
                      setActivePanel("tab-view");
                      setActionResultText("");
                    }}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 font-mono"
                  >
                    ← Back
                  </button>
                  <div className="flex items-center gap-2">
                    {actionResultText && (
                      <button
                        onClick={handleCopyActionText}
                        className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                        title="Copy response"
                      >
                        {copiedActionText ? (
                          <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <IconCopy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    {isActionLoading && (
                      <span className="w-3 h-3 border border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></span>
                    )}
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin space-y-3 pb-2 font-mono text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shrink-0">
                      {activeActionLabel}
                    </span>
                    {isSelectionUsed && (
                      <span className="text-[8px] uppercase font-bold px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        Selection used
                      </span>
                    )}
                  </div>

                  <div className="text-gray-300 leading-relaxed break-words pt-1">
                    {actionResultText ? (
                      <FormatText text={actionResultText} />
                    ) : (
                      isActionLoading && <span className="text-gray-500 italic animate-pulse">Drafting AI review...</span>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
