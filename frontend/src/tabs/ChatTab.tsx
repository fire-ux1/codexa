import React from 'react';
import { IconTerminal, IconCode, IconCopy, IconCheck } from "../components/icons/Icons";
import FormatText from "../components/common/FormatText";

export interface Source {
  path: string;
  symbol?: string;
  file?: string;
  score?: number | string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface ChatTabProps {
  chatHistory: ChatMessage[];
  isAsking: boolean;
  copiedIndex: number | null;
  onCopy: (content: string, index: number) => void;
  onOpenFile: (path: string) => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatTab({
  chatHistory,
  isAsking,
  copiedIndex,
  onCopy,
  onOpenFile,
  chatBottomRef,
}: ChatTabProps) {
  return (
    <div className="space-y-6 animate-fade-in flex flex-col w-full h-[550px]">
      {/* Tab Header with mockup styling */}
      <div className="border-b border-border pb-4 shrink-0">
        <h2 className="text-xl font-bold tracking-tight text-text-strong flex items-center gap-2 font-display">
          <IconTerminal className="w-5 h-5 text-accent" /> Streaming Assistant Conversation
        </h2>
        <p className="mt-1 text-xs text-soft leading-relaxed font-body">
          Chats are securely grounded in repository contexts. The system retrieves codebase references to draft responses.
        </p>
      </div>

      {/* Message Log */}
      <div className="flex-grow space-y-4 overflow-y-auto pr-2 pb-4">
        {chatHistory.length === 0 ? (
          <div className="py-16 text-center text-muted space-y-3">
            <IconTerminal className="w-10 h-10 mx-auto text-muted opacity-60" />
            <p className="text-sm font-body">No queries started yet. Type a question in the prompt sidebar or select a suggestion.</p>
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4.5 rounded-2xl border transition-all ${
                msg.role === "user"
                  ? "bg-panel-alt-2 border-border self-end"
                  : "bg-secondary-dim/5 border-secondary/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                      msg.role === "user"
                        ? "bg-border text-text"
                        : "bg-secondary/15 text-secondary border border-secondary-dim"
                    }`}
                  >
                    {msg.role === "user" ? "Developer" : "CodePilot Assistant"}
                  </span>
                </div>
                <button
                  onClick={() => onCopy(msg.content, idx)}
                  className="p-1 rounded hover:bg-panel-alt text-muted hover:text-text-strong transition-all"
                >
                  {copiedIndex === idx ? (
                    <IconCheck className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <IconCopy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="text-sm font-normal text-text break-words overflow-hidden font-body">
                {msg.content === "" && msg.role === "assistant" ? (
                  <div className="flex items-center gap-2 text-accent font-mono text-xs">
                    <span className="w-2.5 h-2.5 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></span>
                    <span>Writing answer...</span>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <FormatText text={msg.content} />
                    </div>
                    {isAsking && idx === chatHistory.length - 1 && (
                      <span className="inline-block w-1.5 h-3 bg-accent animate-pulse ml-0.5"></span>
                    )}
                  </>
                )}
              </div>

              {/* Attributed Sources using mockup tags styling */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-border">
                  <span className="text-[10px] uppercase font-bold text-muted tracking-wider block mb-2 font-mono">
                    Codebase Context Checked:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => onOpenFile(src.path)}
                        className="cite-chip font-mono text-[10px]"
                      >
                        <IconCode className="w-3 h-3 text-[#FF9D4D]" />
                        {src.symbol || src.file}
                        <span className="text-[8px] opacity-70 ml-1">({src.score})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>
    </div>
  );
}
