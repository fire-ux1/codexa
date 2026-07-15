import React, { useState } from "react";
import { Brain, FileText, Bookmark, Pin, Compass, RefreshCw, Sliders } from "lucide-react";
import RepositoryNotes from "./RepositoryNotes";
import Bookmarks from "./Bookmarks";
import PinnedChats from "./PinnedChats";
import KnowledgeBase from "./KnowledgeBase";
import MemoryManager from "./MemoryManager";
import ContextPanel from "./ContextPanel";

interface WorkspaceMemoryProps {
  onOpenFile: (path: string) => void;
  onSendMessage: (payload: any) => void;
  onClose?: () => void;
  repoPath: string;
  activeFile: string;
  activeSymbol: string;
  selectionRange: any;
  language: string;
  conversationId: string;
  isStreaming: boolean;
  onSelectTab: (tabId: string) => void;
}

interface MemoryTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export default function WorkspaceMemory({
  onOpenFile,
  onSendMessage,
  onClose,
  repoPath,
  activeFile,
  activeSymbol,
  selectionRange,
  language,
  conversationId,
  isStreaming,
  onSelectTab,
}: WorkspaceMemoryProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>("context");

  const tabs: MemoryTab[] = [
    { id: "context", label: "Context", icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: "notes", label: "Notes", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "bookmarks", label: "Bookmarks", icon: <Bookmark className="w-3.5 h-3.5" /> },
    { id: "pins", label: "Pins", icon: <Pin className="w-3.5 h-3.5" /> },
    { id: "kb", label: "Knowledge", icon: <Compass className="w-3.5 h-3.5" /> },
    { id: "restore", label: "Session", icon: <RefreshCw className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-panel text-text border-l border-border overflow-hidden font-sans select-text">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-panel-alt-2/40 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent animate-pulse" />
          <span className="text-[12px] font-semibold text-text-strong">Workspace Memory</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-danger-bg text-muted hover:text-danger cursor-pointer transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-panel shrink-0 select-none overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2.5 px-0.5 text-[11px] font-sans font-medium flex flex-col items-center gap-1 border-b-2 transition-all cursor-pointer min-w-[50px] ${
              activeSubTab === tab.id
                ? "border-accent text-accent bg-accent-dim/10"
                : "border-transparent text-muted hover:text-text hover:bg-panel-alt"
            }`}
          >
            {tab.icon}
            <span className="whitespace-nowrap truncate w-full text-center px-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Viewport */}
      <div className="flex-grow flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0">
        {activeSubTab === "context" && (
          React.createElement(ContextPanel as any, {
            repoPath,
            activeFile,
            activeSymbol,
            selectionRange,
            language,
            conversationId,
            isStreaming,
            onSendMessage,
            onSelectTab,
          })
        )}
        {activeSubTab === "notes" && React.createElement(RepositoryNotes as any)}
        {activeSubTab === "bookmarks" && React.createElement(Bookmarks as any, { onOpenFile })}
        {activeSubTab === "pins" && React.createElement(PinnedChats as any)}
        {activeSubTab === "kb" && React.createElement(KnowledgeBase as any)}
        {activeSubTab === "restore" && (
          React.createElement(MemoryManager as any, {
            onOpenFile,
            onTriggerAction: (prompt: string) => {
              if (onSendMessage) {
                onSendMessage({
                  repo: "",
                  file: "",
                  symbol: "",
                  selection: "",
                  message: prompt,
                });
              }
            }
          })
        )}
      </div>

    </div>
  );
}
