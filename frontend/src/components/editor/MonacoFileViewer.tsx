import React, { useRef } from "react";
import Editor from "@monaco-editor/react";
import { getEditorLanguage } from "../../utils/editorLanguage";
import { runAIActionStream } from "../../services/api";
import { createInlinePatchWidget } from "./InlinePatchWidget";

interface MonacoFileViewerProps {
  filePath: string;
  content: string;
  loading: boolean;
  editorRef?: React.MutableRefObject<any>;
  onExplainSymbol?: (word: string) => void;
  onGoToDefinition?: (word: string) => void;
  onFindReferences?: (word: string) => void;
  onRunSelectionAction?: (actionId: string, label: string, data: any) => void;
  onSelectionChange?: (editor: any) => void;
  onChange?: (value: string) => void;
  repoPath?: string | null;
  onQuickAction?: (actionId: string) => void;
  /** When non-null, renders an inline diff widget anchored to the editor */
  inlinePatch?: {
    status: string;
    instruction: string | null;
    summary: string | null;
    originalContent: string | null;
    modifiedContent: string | null;
    file: string | null;
    diff: string;
  } | null;
  onPatchAccepted?: () => void;
  onPatchRejected?: () => void;
  onReload?: () => void;
}


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
  onReload,
  // New props from AIWorkspace — accepted so TS doesn't error;
  // full inline-diff widget implementation is Phase 2 of the plan.
  inlinePatch: _inlinePatch,
  onPatchAccepted: _onPatchAccepted,
  onPatchRejected: _onPatchRejected,
}: MonacoFileViewerProps) {
  const language = getEditorLanguage(filePath);

  // Inline AI panel state
  // Refs for tracking Monaco instances, active decorations, and widgets
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);
  const widgetRef = useRef<any>(null);

  const cleanupWidgetAndDecorations = () => {
    const editor = editorRef?.current;
    if (editor) {
      if (widgetRef.current) {
        if (typeof widgetRef.current.destroy === "function") {
          widgetRef.current.destroy();
        } else {
          try {
            editor.removeContentWidget(widgetRef.current);
          } catch {
            // ignore
          }
        }
        widgetRef.current = null;
      }
      if (decorationsRef.current) {
        decorationsRef.current.clear();
        decorationsRef.current = null;
      }
    }
  };

  // Clean up when switching files
  React.useEffect(() => {
    return () => {
      cleanupWidgetAndDecorations();
    };
  }, [filePath]);

  // Render/update global inline diff preview widget
  React.useEffect(() => {
    const editor = editorRef?.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (!_inlinePatch || _inlinePatch.file !== filePath) {
      cleanupWidgetAndDecorations();
      return;
    }

    cleanupWidgetAndDecorations();

    const position = editor.getPosition() || { lineNumber: 1, column: 1 };
    const targetLineNumber = position.lineNumber;

    let header = "✨ AI Patch Suggestion";
    if (_inlinePatch.status === "generating") {
      header = "✨ AI is Generating Patch...";
    } else if (_inlinePatch.status === "ready") {
      header = "✨ AI Patch Ready";
    }

    const patchDecorations = [
      {
        range: new monaco.Range(targetLineNumber, 1, targetLineNumber, 1),
        options: {
          isWholeLine: true,
          className: _inlinePatch.status === "generating" ? "ai-processing-line" : "diff-del-line",
          linesDecorationsClassName: _inlinePatch.status === "generating" ? "ai-processing-gutter" : "diff-del-gutter",
        },
      },
    ];
    decorationsRef.current = editor.createDecorationsCollection(patchDecorations);

    const instance = createInlinePatchWidget(editor, monaco, {
      id: "global-inline-patch-widget",
      lineNumber: targetLineNumber + 1,
      headerText: header,
      bodyText: _inlinePatch.summary || _inlinePatch.instruction || "Applying modifications...",
      showActions: _inlinePatch.status === "ready",
      onAccept: () => {
        instance.destroy();
        cleanupWidgetAndDecorations();
        if (_onPatchAccepted) _onPatchAccepted();
      },
      onReject: () => {
        instance.destroy();
        cleanupWidgetAndDecorations();
        if (_onPatchRejected) _onPatchRejected();
      },
    });

    widgetRef.current = {
      destroy: instance.destroy,
      getId: () => "global-inline-patch-widget",
      getDomNode: () => instance.domNode,
      getPosition: () => instance.widget.getPosition(),
    };

    return () => {
      instance.destroy();
    };
  }, [_inlinePatch, filePath]);

  const runInlineAction = async (ed: any, actionId: string, label: string) => {
    const model = ed.getModel();
    const selection = ed.getSelection();
    const selectionText = model?.getValueInRange(selection);
    const monaco = monacoRef.current;

    if (!selectionText || !selectionText.trim() || !monaco) {
      // No selection — fall back to whole-file action in the right sidebar
      if (onRunSelectionAction) {
        onRunSelectionAction(actionId, label, null);
      }
      return;
    }

    // Clean up any existing active widget/decorations first
    cleanupWidgetAndDecorations();

    const startLine = selection.startLineNumber;
    const endLine = selection.endLineNumber;

    // Apply amber scanning/processing decorations
    const processingDecorations = [
      {
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: "ai-processing-line",
          linesDecorationsClassName: "ai-processing-gutter",
        },
      },
    ];
    decorationsRef.current = ed.createDecorationsCollection(processingDecorations);

    // Create the Content Widget DOM Node
    const domNode = document.createElement("div");
    domNode.className = "monaco-inline-patch-widget";
    domNode.innerHTML = `
      <div class="ip-header">◆ ${label}</div>
      <div class="ip-body font-mono text-[11px] text-soft whitespace-pre-wrap">AI is analyzing selection...</div>
      <div class="ip-actions" style="display: none;">
        <button class="ip-reject">Dismiss</button>
        ${actionId !== "explain" ? '<button class="ip-accept">Accept patch</button>' : ''}
      </div>
    `;

    const widgetId = `patch-widget-${actionId}-${Date.now()}`;
    const widget: any = {
      getId: () => widgetId,
      getDomNode: () => domNode,
      getPosition: () => {
        // Query dynamic range of decoration to handle edits above
        const ranges = decorationsRef.current?.getRanges();
        const currentEndLine = (ranges && ranges.length > 0) ? ranges[0].endLineNumber : endLine;
        return {
          position: { lineNumber: currentEndLine + 1, column: 1 },
          preference: [
            monaco.editor.ContentWidgetPositionPreference.BELOW,
            monaco.editor.ContentWidgetPositionPreference.ABOVE,
          ],
        };
      },
    };

    widgetRef.current = widget;
    ed.addContentWidget(widget);
    ed.layoutContentWidget(widget);

    try {
      const response = await runAIActionStream({
        repo: repoPath || "",
        file: filePath,
        action: actionId,
        selection: selectionText,
        stream: true,
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const body = response.body;
      if (!body) throw new Error("ReadableStream is not supported or empty body");

      const reader = body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulated = "";

      const updateWidgetText = (text: string) => {
        const bodyEl = domNode.querySelector(".ip-body");
        if (bodyEl) {
          let displayCode = text;
          // Strip markdown fences
          const fenceMatch = displayCode.match(/```[\w]*\n?([\s\S]*?)```/);
          if (fenceMatch) {
            displayCode = fenceMatch[1].trim();
          } else {
            displayCode = displayCode.replace(/^```\w*\n/, "").replace(/```$/, "");
          }
          bodyEl.textContent = displayCode;
          bodyEl.scrollTop = bodyEl.scrollHeight;
        }
      };

      const processLines = (text: string) => {
        buffer += text;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === "token") {
              accumulated += parsed.token;
              updateWidgetText(accumulated);
              ed.layoutContentWidget(widget);
            }
          } catch { /* ignore */ }
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

      // Transition to final state: switch to diff red decorations (for replacement suggestions)
      if (decorationsRef.current) {
        decorationsRef.current.clear();
      }

      const endDecorations = [
        {
          range: new monaco.Range(startLine, 1, endLine, 1),
          options: {
            isWholeLine: true,
            className: actionId !== "explain" ? "diff-del-line" : "ai-processing-line",
            linesDecorationsClassName: actionId !== "explain" ? "diff-del-gutter" : "ai-processing-gutter",
          },
        },
      ];
      decorationsRef.current = ed.createDecorationsCollection(endDecorations);

      // Display the interactive Accept/Reject buttons
      const actionsEl = domNode.querySelector(".ip-actions") as HTMLElement;
      if (actionsEl) {
        actionsEl.style.display = "flex";
      }

      // Wire event listeners
      domNode.querySelector(".ip-reject")?.addEventListener("click", () => {
        cleanupWidgetAndDecorations();
      });

      if (actionId !== "explain") {
        domNode.querySelector(".ip-accept")?.addEventListener("click", () => {
          const ranges = decorationsRef.current?.getRanges();
          const activeRange = (ranges && ranges.length > 0) ? ranges[0] : new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine));

          let finalCode = accumulated;
          const fenceMatch = finalCode.match(/```[\w]*\n?([\s\S]*?)```/);
          if (fenceMatch) finalCode = fenceMatch[1].trim();

          ed.executeEdits("ai-patch-accept", [
            {
              range: activeRange,
              text: finalCode,
              forceMoveMarkers: true,
            },
          ]);
          cleanupWidgetAndDecorations();
        });
      }

      ed.layoutContentWidget(widget);

    } catch (err: any) {
      const bodyEl = domNode.querySelector(".ip-body");
      if (bodyEl) {
        bodyEl.textContent = `Error: ${err.message}`;
      }
      const actionsEl = domNode.querySelector(".ip-actions") as HTMLElement;
      if (actionsEl) {
        actionsEl.style.display = "flex";
      }
      domNode.querySelector(".ip-reject")?.addEventListener("click", () => {
        cleanupWidgetAndDecorations();
      });
      ed.layoutContentWidget(widget);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    monacoRef.current = monaco;
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

    // Propagate selection changes to parent (AI Workspace)
    if (onSelectionChange) {
      editor.onDidChangeCursorSelection(() => {
        onSelectionChange(editor);
      });
    }

    // --- Navigation actions ---
    if (onExplainSymbol) {
      editor.addAction({
        id: "explain-symbol",
        label: "Explain Symbol",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.5,
        run: (ed: any) => {
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
        run: (ed: any) => {
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
        run: (ed: any) => {
          const position = ed.getPosition();
          const word = ed.getModel().getWordAtPosition(position);
          if (word) onFindReferences(word.word);
        },
      });
    }

    // --- Inline AI actions ---
    editor.addAction({
      id: "ai-explain-selection",
      label: "✨ AI: Explain Selected Code",
      contextMenuGroupId: "ai-inline",
      contextMenuOrder: 2.1,
      run: (ed: any) => runInlineAction(ed, "explain", "Explain Code"),
    });

    editor.addAction({
      id: "ai-refactor-selection",
      label: "🔧 AI: Refactor Selected Code",
      contextMenuGroupId: "ai-inline",
      contextMenuOrder: 2.2,
      run: (ed: any) => runInlineAction(ed, "refactor", "Refactor Code"),
    });

    editor.addAction({
      id: "ai-generate-docs",
      label: "📝 AI: Generate Docs for Selection",
      contextMenuGroupId: "ai-inline",
      contextMenuOrder: 2.3,
      run: (ed: any) => runInlineAction(ed, "generate_docs", "Generate Docs"),
    });

    editor.addAction({
      id: "ai-generate-tests",
      label: "🧪 AI: Generate Tests for Selection",
      contextMenuGroupId: "ai-inline",
      contextMenuOrder: 2.4,
      run: (ed: any) => runInlineAction(ed, "generate_tests", "Generate Tests"),
    });
  };

  const options = {
    readOnly: false,
    minimap: { enabled: true },
    wordWrap: "on" as const,
    automaticLayout: true,
    lineNumbers: "on" as const,
    smoothScrolling: true,
    fontSize: 12,
    fontFamily: "JetBrains Mono, Fira Code, Courier New, monospace",
    cursorBlinking: "smooth" as const,
    scrollBeyondLastLine: false,
    renderLineHighlight: "all" as const,
    contextmenu: true,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[380px]">
        <span className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></span>
      </div>
    );
  }

  const isError = content.startsWith("// Error loading file:");
  const errorMessage = isError ? content.replace("// Error loading file:", "").trim() : "";

  if (isError) {
    return (
      <div className="w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-border bg-bg flex flex-col items-center justify-center p-8 text-center font-sans space-y-4 select-none">
        <div className="w-12 h-12 rounded-full bg-danger-bg/25 flex items-center justify-center text-danger">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-sm font-semibold text-text-strong">Failed to load file</h3>
          <p className="text-xs text-muted truncate">{filePath.split(/[/\\]/).pop()}</p>
          <div className="text-[11px] text-danger-text bg-danger-bg/10 border border-danger/10 px-3 py-2.5 rounded-lg text-left font-mono break-all max-h-[100px] overflow-y-auto scrollbar-thin">
            {errorMessage || "Unknown file read error."}
          </div>
        </div>
        {onReload && (
          <button
            onClick={onReload}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-600/10"
          >
            Reload File
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-border bg-bg flex flex-col relative shadow-md">
      {/* Monaco Editor */}
      <div className="flex-grow min-h-0">
        <Editor
          height="100%"
          language={language}
          value={content || ""}
          theme="vs-dark"
          options={options}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full">
              <span className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></span>
            </div>
          }
        />
      </div>
    </div>
  );
}
