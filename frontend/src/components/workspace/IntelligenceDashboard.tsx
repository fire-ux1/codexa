import React, { useState } from "react";
import { ShieldCheck, Bug, Lightbulb, Shield, BookOpen, Cpu } from "lucide-react";
import CodeReviewPanel from "./CodeReviewPanel";
import BugAnalysis from "./BugAnalysis";
import RefactorAssistant from "./RefactorAssistant";
import TestGenerator from "./TestGenerator";
import DocumentationGenerator from "./DocumentationGenerator";

interface IntelligenceDashboardProps {
  activeFile: string | null | undefined;
  onSendMessage: (payload: any) => void;
  onClose?: () => void;
}

export default function IntelligenceDashboard({ activeFile, onSendMessage, onClose }: IntelligenceDashboardProps) {
  const [intelTab, setIntelTab] = useState<string>("review");

  const tabs = [
    { id: "review", label: "Review", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: "bugs", label: "Bugs", icon: <Bug className="w-3.5 h-3.5" /> },
    { id: "refactor", label: "Refactor", icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { id: "tests", label: "Tests", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "docs", label: "Docs", icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  const handleTriggerAction = (prompt: string) => {
    if (onSendMessage) {
      onSendMessage({
        repo: "",
        file: activeFile || "",
        symbol: "",
        selection: "",
        message: prompt,
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg text-text border-l border-border overflow-hidden font-sans select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-panel shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-strong">AI Code Intelligence</span>
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
            onClick={() => setIntelTab(tab.id)}
            className={`flex-1 py-2 px-1 text-[9px] font-mono font-bold uppercase tracking-wider flex flex-col items-center gap-1 border-b-2 transition-all cursor-pointer ${
              intelTab === tab.id
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
        {intelTab === "review" && (
          React.createElement(CodeReviewPanel as any, { activeFile, onTriggerAction: handleTriggerAction })
        )}
        {intelTab === "bugs" && (
          React.createElement(BugAnalysis as any, { activeFile, onTriggerAction: handleTriggerAction })
        )}
        {intelTab === "refactor" && (
          React.createElement(RefactorAssistant as any, { activeFile, onTriggerAction: handleTriggerAction })
        )}
        {intelTab === "tests" && (
          React.createElement(TestGenerator as any, { activeFile, onTriggerAction: handleTriggerAction })
        )}
        {intelTab === "docs" && (
          React.createElement(DocumentationGenerator as any, { activeFile, onTriggerAction: handleTriggerAction })
        )}
      </div>

    </div>
  );
}
