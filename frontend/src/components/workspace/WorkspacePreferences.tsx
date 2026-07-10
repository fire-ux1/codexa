import React, { useState } from "react";
import { Settings, Sparkles, Layout, Keyboard, ShieldAlert, Key, Lock, Sliders, ShieldCheck } from "lucide-react";
import ThemeManager from "./ThemeManager";
import LayoutManager from "./LayoutManager";
import KeyboardShortcutPanel from "./KeyboardShortcutPanel";
import WorkspaceProfiles from "./WorkspaceProfiles";
import ApiKeysManager from "./ApiKeysManager";
import MfaSetup from "./MfaSetup";
import ComplianceManager from "./ComplianceManager";
import IntegrationsManager from "./IntegrationsManager";

interface WorkspacePreferencesProps {
  onApplyProfile: (profile: any) => void;
  onClose?: () => void;
}

interface PreferenceTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export default function WorkspacePreferences({ onApplyProfile, onClose }: WorkspacePreferencesProps) {
  const [prefTab, setPrefTab] = useState<string>("theme");

  const tabs: PreferenceTab[] = [
    { id: "theme", label: "Themes", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "layout", label: "Layouts", icon: <Layout className="w-3.5 h-3.5" /> },
    { id: "shortcuts", label: "Shortcuts", icon: <Keyboard className="w-3.5 h-3.5" /> },
    { id: "profiles", label: "Profiles", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { id: "apikeys", label: "API Keys", icon: <Key className="w-3.5 h-3.5" /> },
    { id: "security", label: "Security & 2FA", icon: <Lock className="w-3.5 h-3.5" /> },
    { id: "compliance", label: "Compliance & Policies", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: "integrations", label: "Integrations", icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-panel text-text border-l border-border overflow-hidden font-sans select-text">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-panel-alt-2/40 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-accent" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-strong">Preferences Panel</span>
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
      <div className="flex border-b border-border bg-panel shrink-0 select-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPrefTab(tab.id)}
            className={`flex-1 py-2.5 px-1 text-[9px] font-mono font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              prefTab === tab.id
                ? "border-accent text-accent bg-accent-dim/10"
                : "border-transparent text-muted hover:text-text hover:bg-panel-alt"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Viewport */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0">
        {prefTab === "theme" && React.createElement(ThemeManager as any)}
        {prefTab === "layout" && React.createElement(LayoutManager as any)}
        {prefTab === "shortcuts" && React.createElement(KeyboardShortcutPanel as any)}
        {prefTab === "profiles" && (
          React.createElement(WorkspaceProfiles as any, { onApplyProfile })
        )}
        {prefTab === "apikeys" && React.createElement(ApiKeysManager as any)}
        {prefTab === "security" && React.createElement(MfaSetup as any)}
        {prefTab === "compliance" && React.createElement(ComplianceManager as any)}
        {prefTab === "integrations" && React.createElement(IntegrationsManager as any)}
      </div>

    </div>
  );
}
