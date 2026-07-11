import React, { useState } from "react";
import { Users, Globe, Download, Bell, MessageSquare } from "lucide-react";
import ShareWorkspace from "./ShareWorkspace";
import ReportGenerator from "./ReportGenerator";
import ExportManager from "./ExportManager";
import CommentSystem from "./CommentSystem";
import NotificationCenter from "./NotificationCenter";

interface CollaborationPanelProps {
  activeFile: string | null | undefined;
  repoId?: string;
  onClose?: () => void;
}

export default function CollaborationPanel({ activeFile, repoId, onClose }: CollaborationPanelProps) {
  const [collabTab, setCollabTab] = useState<string>("share");

  const tabs = [
    { id: "share", label: "Share", icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "comments", label: "Comments", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "alerts", label: "Alerts", icon: <Bell className="w-3.5 h-3.5" /> },
    { id: "reports", label: "Reports", icon: <Download className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-bg text-text border-l border-border overflow-hidden font-sans select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-panel shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-strong">Collaboration Studio</span>
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
      <div className="flex border-b border-border bg-panel-alt-2/20 shrink-0 select-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCollabTab(tab.id)}
            className={`flex-1 py-2 px-1 text-[9px] font-mono font-bold uppercase tracking-wider flex flex-col items-center gap-1 border-b-2 transition-all cursor-pointer ${
              collabTab === tab.id
                ? "border-accent text-accent bg-accent-dim/10"
                : "border-transparent text-muted hover:text-text-strong hover:bg-panel-alt"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0 select-text bg-bg">
        {collabTab === "share" && React.createElement(ShareWorkspace as any)}
        {collabTab === "comments" && <CommentSystem activeFile={activeFile} />}
        {collabTab === "alerts" && React.createElement(NotificationCenter as any)}
        {collabTab === "reports" && (
          <div className="space-y-4">
            {React.createElement(ReportGenerator as any, { repositoryId: repoId })}
            {React.createElement(ExportManager as any)}
          </div>
        )}
      </div>

    </div>
  );
}
