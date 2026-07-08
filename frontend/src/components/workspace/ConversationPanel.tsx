import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import ChatHistory from "./ChatHistory";
import PromptBox from "./PromptBox";
import ActionCenter from "./ActionCenter";
import StreamingResponse from "./StreamingResponse";
import { fetchFileSymbols, askQuestion } from "../../services/api";

interface ConversationPanelProps {
  repoPath: string;
  activeFile: string | null | undefined;
  activeSymbol: string;
  selectionText: string;
  selectionRange: any;
  messages: any[];
  isStreaming: boolean;
  onSendMessage: (payload: any) => void;
  onStop: () => void;
  onNewConversation: () => void;
}

interface FileContextState {
  summary: string;
  symbols: any[];
  imports: string[];
  suggestions: string[];
}

export default function ConversationPanel({
  repoPath,
  activeFile,
  activeSymbol,
  selectionText,
  selectionRange,
  messages,
  isStreaming,
  onSendMessage,
  onStop,
  onNewConversation,
}: ConversationPanelProps) {
  const [contextOpen, setContextOpen] = useState<boolean>(false);
  const [contextLoading, setContextLoading] = useState<boolean>(false);
  const [fileContext, setFileContext] = useState<FileContextState>({
    summary: "",
    symbols: [],
    imports: [],
    suggestions: [],
  });

  // Automatically compute file context when activeFile changes
  useEffect(() => {
    if (!activeFile) {
      setFileContext({ summary: "", symbols: [], imports: [], suggestions: [] });
      return;
    }

    setContextLoading(true);
    const fileName = activeFile.split(/[/\\]/).pop();

    Promise.all([
      fetchFileSymbols(activeFile)
        .then((res) => res)
        .catch(() => []),
      askQuestion(
        `Analyze the file '${fileName}' in this codebase. Provide: 1. A 1-sentence technical summary of its purpose. 2. Two short refactoring or code quality suggestions. Format as clean JSON or text.`,
        repoPath
      )
        .then((res) => res?.answer || "")
        .catch(() => ""),
    ])
      .then(([symbols, aiRes]) => {
        const functions = (symbols || []).filter((s: any) => s.kind === "function" || s.kind === "method");
        const classes = (symbols || []).filter((s: any) => s.kind === "class");

        // Parse AI summary and suggestions text
        let summary = `Technical handler module for ${fileName}.`;
        let suggestions = ["Consider adding unit tests.", "Ensure input bounds are validated."];

        if (aiRes) {
          const lines = aiRes.split("\n").map((l: string) => l.trim()).filter(Boolean);
          const firstLine = lines.find((l: string) => !l.startsWith("-") && !l.startsWith("*") && l.length > 20);
          if (firstLine) {
            summary = firstLine.replace(/^\d+\.\s*/, "");
          }
          const bullets = lines.filter((l: string) => l.startsWith("-") || l.startsWith("*") || /^\d+\.\s+/.test(l));
          if (bullets.length > 0) {
            suggestions = bullets.slice(0, 2).map((b: string) => b.replace(/^[-*\d.\s]+/, ""));
          }
        }

        setFileContext({
          summary,
          symbols: [...classes, ...functions].slice(0, 6),
          imports: ["os", "sys"].slice(0, 3),
          suggestions,
        });
      })
      .catch((err) => {
        console.error("Context engine failure:", err);
      })
      .finally(() => {
        setContextLoading(false);
      });
  }, [activeFile, repoPath]);

  const handleSubmit = useCallback(
    (message: string) => {
      onSendMessage({
        repo: repoPath,
        file: activeFile,
        symbol: activeSymbol,
        selection: selectionText,
        message,
      });
    },
    [repoPath, activeFile, activeSymbol, selectionText, onSendMessage]
  );

  const triggerSuggestedAction = (actionText: string) => {
    handleSubmit(actionText);
  };

  const activeFileName = activeFile ? activeFile.split(/[/\\]/).pop() : null;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-bg select-text">
      {/* Panel header */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border shrink-0 bg-panel select-none">
        <div className="w-1.5 h-1.5 rounded-full bg-accent glowing-dot" />
        <span className="text-[10px] font-bold text-muted font-mono uppercase tracking-widest">Assistant Panel</span>
        <button
          onClick={onNewConversation}
          title="New Chat Session"
          className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold text-muted hover:text-accent hover:bg-accent-dim/10 rounded border border-transparent hover:border-border transition-all uppercase tracking-wider cursor-pointer"
        >
          <span>+</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Automatic Context Engine Dropdown */}
      {activeFileName && (
        <div className="border-b border-border shrink-0 bg-panel-alt-2/45 transition-all select-none">
          <button
            onClick={() => setContextOpen(!contextOpen)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs text-muted hover:text-text-strong transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Active Context: {activeFileName}</span>
            </div>
            {contextOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {contextOpen && (
            <div className="px-3 pb-3 border-t border-border pt-2.5 space-y-3 max-h-[220px] overflow-y-auto text-[10px] font-mono text-muted scrollbar-none select-text">
              {contextLoading ? (
                <div className="py-3 flex items-center justify-center gap-2 text-muted">
                  <span className="w-3.5 h-3.5 border border-accent/20 border-t-accent rounded-full animate-spin"></span>
                  <span>Extracting file outline & reviews...</span>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div>
                    <span className="text-[9px] text-muted uppercase font-bold block mb-1">AI File Summary</span>
                    <p className="text-text leading-relaxed font-sans">{fileContext.summary}</p>
                  </div>

                  {/* Symbols & outline */}
                  {fileContext.symbols.length > 0 && (
                    <div>
                      <span className="text-[9px] text-muted uppercase font-bold block mb-1">File Outline</span>
                      <div className="flex flex-wrap gap-1">
                        {fileContext.symbols.map((sym) => (
                          <span
                            key={sym.name}
                            className="px-1.5 py-0.5 rounded bg-bg border border-border text-[9px] text-secondary"
                          >
                            {sym.kind === "class" ? "cl:" : "fn:"}{sym.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI suggestions */}
                  {fileContext.suggestions.length > 0 && (
                    <div>
                      <span className="text-[9px] text-muted uppercase font-bold block mb-1">AI Quality Tips</span>
                      <div className="space-y-1 font-sans text-text">
                        {fileContext.suggestions.map((sug, idx) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span className="text-accent mt-0.5">•</span>
                            <p className="leading-snug">{sug}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chat Messages history */}
      {messages.length === 0 ? (
        <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-5 select-none bg-bg">
          {/* Greeting */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">👋</span>
              <h3 className="text-xs font-bold text-text-strong font-sans">Hi Abhishek!</h3>
            </div>
            <p className="text-[10px] text-muted font-sans leading-relaxed">
              I'm your AI coding partner. What would you like to do today?
            </p>
          </div>

          {React.createElement(ActionCenter as any, {
            activeFile,
            onTriggerAction: (prompt: string) => triggerSuggestedAction(prompt),
            workflowState: isStreaming ? { step: 2, status: 'running' } : null,
          })}
        </div>
      ) : (
        <div className="flex-grow flex flex-col min-h-0 overflow-hidden bg-bg">
          {React.createElement(ChatHistory as any, { messages })}
          {isStreaming && (
            <div className="px-4 pb-3 border-t border-border/40 pt-2 bg-panel-alt-2/10">
              <StreamingResponse isStreaming={isStreaming} activeFile={activeFile || undefined} />
            </div>
          )}
        </div>
      )}

      {/* Quick Suggested Action tags strip (always visible above the input area) */}
      <div className="px-3 pt-2 shrink-0 flex flex-wrap gap-1.5 bg-bg select-none">
        <button
          onClick={() => triggerSuggestedAction(`Explain the file ${activeFileName || "this repo"} and its structural flows.`)}
          className="px-2 py-1 rounded-lg bg-panel hover:bg-panel-alt border border-border text-[9px] text-text font-mono transition-colors cursor-pointer"
        >
          🔍 Explain File
        </button>
        <button
          onClick={() => triggerSuggestedAction(`Generate unit tests for the functions defined in ${activeFileName || "this repo"}.`)}
          className="px-2 py-1 rounded-lg bg-panel hover:bg-panel-alt border border-border text-[9px] text-text font-mono transition-colors cursor-pointer"
        >
          🧪 Generate Tests
        </button>
        <button
          onClick={() => triggerSuggestedAction(`Refactor the current selection to improve complexity and readability.`)}
          className="px-2 py-1 rounded-lg bg-panel hover:bg-panel-alt border border-border text-[9px] text-text font-mono transition-colors cursor-pointer"
        >
          ⚡ Refactor Code
        </button>
      </div>

      {/* Streaming status logs */}
      {isStreaming && (
        <div className="px-3 py-1.5 bg-panel border-t border-border flex items-center gap-2 select-none shrink-0 font-mono text-[9px] text-accent">
          <span className="w-2.5 h-2.5 border border-accent/20 border-t-accent rounded-full animate-spin shrink-0"></span>
          <span className="animate-pulse">Thinking: Reading repository... analyzing imports... understanding dependencies...</span>
        </div>
      )}

      {/* Text Area PromptBox */}
      <PromptBox
        onSubmit={handleSubmit}
        isStreaming={isStreaming}
        onStop={onStop}
        hasSelection={!!selectionText}
        selectionRange={selectionRange}
      />
    </div>
  );
}
