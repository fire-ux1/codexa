import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { getEditorLanguage } from "../../utils/editorLanguage";
import { runAIActionStream } from "../../services/api";
import FormatText from "../common/FormatText";

export default function MonacoFileViewer({
  filePath,
  content,
  loading,
  editorRef,
  onExplainSymbol,
  onGoToDefinition,
  onFindReferences,
  onRunSelectionAction,
  onSelectionChange,
  onChange,
  repoPath,
}) {
  const language = getEditorLanguage(filePath);

  // Inline AI panel state
  const [inlinePanel, setInlinePanel] = useState(null); // null | { label, actionId, selectionText, resultText, isLoading, previewEdit }
  const inlinePanelRef = useRef(null);

  const runInlineAction = async (ed, actionId, label) => {
    const model = ed.getModel();
    const selection = ed.getSelection();
    const selectionText = model?.getValueInRange(selection);

    if (!selectionText || !selectionText.trim()) {
      // No selection — fall back to whole-file action in the right sidebar
      if (onRunSelectionAction) {
        onRunSelectionAction(actionId, label, null);
      }
      return;
    }

    setInlinePanel({ label, actionId, selectionText, resultText: "", isLoading: true, previewEdit: null });
    inlinePanelRef.current = { selection, model };

    try {
      const response = await runAIActionStream({
        repo: repoPath || "",
        file: filePath,
        action: actionId,
        selection: selectionText,
        stream: true,
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulated = "";

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
              accumulated += parsed.token;
              setInlinePanel((prev) => ({ ...prev, resultText: accumulated }));
            }
          } catch { /* ignore */ }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) { if (buffer.trim()) processLines("\n"); break; }
        processLines(decoder.decode(value));
      }

      setInlinePanel((prev) => ({ ...prev, isLoading: false }));
    } catch (err) {
      setInlinePanel((prev) => ({ ...prev, resultText: `Error: ${err.message}`, isLoading: false }));
    }
  };

  const handleReplaceSelection = (ed) => {
    if (!inlinePanel || !inlinePanelRef.current) return;
    const { selection } = inlinePanelRef.current;

    // Extract code block from markdown fences if present
    let codeToInsert = inlinePanel.resultText;
    const fenceMatch = codeToInsert.match(/```[\w]*\n?([\s\S]*?)```/);
    if (fenceMatch) codeToInsert = fenceMatch[1].trim();

    ed.executeEdits("inline-ai", [
      { range: selection, text: codeToInsert, forceMoveMarkers: true },
    ]);
    setInlinePanel(null);
    inlinePanelRef.current = null;
  };

  const handleEditorDidMount = (editor) => {
    if (editorRef) {
      editorRef.current = editor;
    }

    // Handle content modifications and propagate back to the parent
    editor.onDidChangeModelContent(() => {
      const val = editor.getValue();
      if (onChange) {
        onChange(val);
      }
    });

    // Propagate selection changes to parent (Phase 19 AI Workspace)
    if (onSelectionChange) {
      editor.onDidChangeCursorSelection(() => {
        onSelectionChange(editor);
      });
    }

    // --- Navigation actions (Phase 13) ---
    if (onExplainSymbol) {
      editor.addAction({
        id: "explain-symbol",
        label: "Explain Symbol",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.5,
        run: (ed) => {
          const position = ed.getPosition();
          const word = ed.getModel().getWordAtPosition(position);
          if (word) onExplainSymbol(word.word);
        },
      });
    }

    if (onGoToDefinition) {
      editor.addAction({
        id: "goto-definition",
        label: "Go to Definition",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.6,
        run: (ed) => {
          const position = ed.getPosition();
          const word = ed.getModel().getWordAtPosition(position);
          if (word) onGoToDefinition(word.word);
        },
      });
    }

    if (onFindReferences) {
      editor.addAction({
        id: "find-references",
        label: "Find References",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.7,
        run: (ed) => {
          const position = ed.getPosition();
          const word = ed.getModel().getWordAtPosition(position);
          if (word) onFindReferences(word.word);
        },
      });
    }

    // --- Inline AI actions (Phase 15) ---
    editor.addAction({
      id: "ai-explain-selection",
      label: "✨ AI: Explain Selected Code",
      contextMenuGroupId: "ai-inline",
      contextMenuOrder: 2.1,
      run: (ed) => runInlineAction(ed, "explain", "Explain Code"),
    });

    editor.addAction({
      id: "ai-refactor-selection",
      label: "🔧 AI: Refactor Selected Code",
      contextMenuGroupId: "ai-inline",
      contextMenuOrder: 2.2,
      run: (ed) => runInlineAction(ed, "refactor", "Refactor Code"),
    });

    editor.addAction({
      id: "ai-generate-docs",
      label: "📝 AI: Generate Docs for Selection",
      contextMenuGroupId: "ai-inline",
      contextMenuOrder: 2.3,
      run: (ed) => runInlineAction(ed, "generate_docs", "Generate Docs"),
    });

    editor.addAction({
      id: "ai-generate-tests",
      label: "🧪 AI: Generate Tests for Selection",
      contextMenuGroupId: "ai-inline",
      contextMenuOrder: 2.4,
      run: (ed) => runInlineAction(ed, "generate_tests", "Generate Tests"),
    });
  };

  const options = {
    readOnly: false, // Allow inline edits via executeEdits
    minimap: { enabled: true },
    wordWrap: "on",
    automaticLayout: true,
    lineNumbers: "on",
    smoothScrolling: true,
    fontSize: 12,
    fontFamily: "JetBrains Mono, Fira Code, Courier New, monospace",
    cursorBlinking: "smooth",
    scrollBeyondLastLine: false,
    renderLineHighlight: "all",
    contextmenu: true,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[380px]">
        <span className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-white/5 bg-[#1e1e1e] flex flex-col relative">
      {/* Monaco Editor */}
      <div className="flex-grow min-h-0">
        <Editor
          height={inlinePanel ? "55%" : "100%"}
          language={language}
          value={content || ""}
          theme="vs-dark"
          options={options}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full">
              <span className="w-6 h-6 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></span>
            </div>
          }
        />
      </div>

      {/* Inline AI Panel (Phase 15) */}
      {inlinePanel && (
        <div className="border-t border-indigo-500/30 bg-slate-950/90 flex flex-col" style={{ height: "45%", minHeight: 160 }}>
          {/* Panel Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-400 border border-violet-500/20 font-mono">
                {inlinePanel.label}
              </span>
              {inlinePanel.isLoading && (
                <span className="w-3 h-3 border border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></span>
              )}
              <span className="text-[9px] text-gray-500 font-mono">Selection: {inlinePanel.selectionText.slice(0, 40)}{inlinePanel.selectionText.length > 40 ? "…" : ""}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!inlinePanel.isLoading && inlinePanel.resultText && (
                <>
                  <button
                    onClick={() => navigator.clipboard.writeText(inlinePanel.resultText)}
                    className="px-2 py-0.5 text-[9px] font-bold rounded bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all font-mono"
                  >
                    Copy
                  </button>
                  {editorRef?.current && (
                    <button
                      onClick={() => handleReplaceSelection(editorRef.current)}
                      className="px-2 py-0.5 text-[9px] font-bold rounded bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/40 transition-all font-mono"
                    >
                      Replace Selection
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => { setInlinePanel(null); inlinePanelRef.current = null; }}
                className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/5 border border-white/10 text-gray-500 hover:text-white transition-all font-mono"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Panel Body — streamed result */}
          <div className="flex-grow overflow-y-auto p-3 text-xs font-mono text-gray-300 leading-relaxed scrollbar-thin">
            {inlinePanel.resultText ? (
              <FormatText text={inlinePanel.resultText} />
            ) : (
              inlinePanel.isLoading && (
                <span className="text-gray-500 italic animate-pulse">AI is analyzing your selection...</span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
