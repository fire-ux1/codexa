import { useState } from "react";
import {
  Folder, Search, Network, Bot, History, Settings,
  ChevronLeft, ChevronRight, Flame, Sparkles
} from "lucide-react";

interface ActivityBarProps {
  activeActivity: string;
  onSelectActivity: (activity: string) => void;
  activeMode: string;
  onSelectMode: (mode: string) => void;
  rightTab: string;
  onSelectRightTab: (tab: string) => void;
  onToggleRightSidebar: (collapsed: boolean) => void;
  onExecuteQuickAction?: (id: string, label: string) => void;
}

export default function ActivityBar({
  activeActivity,
  onSelectActivity,
  activeMode,
  onSelectMode,
  rightTab,
  onSelectRightTab,
  onToggleRightSidebar,
  onExecuteQuickAction,
}: ActivityBarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const navItems = [
    {
      key: "explorer",
      label: "Explorer",
      icon: Folder,
      isActive: activeActivity === "repository" && activeMode === "editor",
      onClick: () => { onSelectActivity("repository"); onSelectMode("editor"); },
    },
    {
      key: "search",
      label: "Search",
      icon: Search,
      isActive: activeActivity === "search" && activeMode === "editor",
      onClick: () => { onSelectActivity("search"); onSelectMode("editor"); },
    },
    {
      key: "graph",
      label: "Graph",
      icon: Network,
      isActive: activeMode === "understand" || activeMode === "trace",
      onClick: () => { onSelectMode("understand"); },
    },
    {
      key: "agents",
      label: "Agents",
      icon: Bot,
      isActive: rightTab === "agents",
      onClick: () => { onSelectRightTab("agents"); onToggleRightSidebar(false); },
    },
    {
      key: "history",
      label: "History",
      icon: History,
      isActive: activeActivity === "history" && activeMode === "editor",
      onClick: () => { onSelectActivity("history"); onSelectMode("editor"); },
    },
    {
      key: "settings",
      label: "Settings",
      icon: Settings,
      isActive: activeActivity === "settings" && activeMode === "editor",
      onClick: () => { onSelectActivity("settings"); onSelectMode("editor"); },
    },
  ];

  const quickActions = [
    { id: "explain", label: "Explain Code" },
    { id: "generate_tests", label: "Generate Tests" },
    { id: "find_bugs", label: "Find Bugs" },
    { id: "refactor", label: "Refactor" },
  ];

  return (
    <div
      style={{ width: isCollapsed ? "52px" : "150px" }}
      className="shrink-0 bg-bg border-r border-border flex flex-col justify-between select-none py-3 transition-all duration-200 z-20 h-full overflow-hidden shadow-sm"
    >
      {/* Top Menu list */}
      <div className="flex flex-col gap-5 px-2">
        {/* Toggle Collapse */}
        <div className="flex justify-end pr-1 border-b border-border pb-2 mb-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-panel-alt text-muted hover:text-text-strong transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={item.onClick}
                className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all relative cursor-pointer ${
                  item.isActive
                    ? "bg-accent-dim/15 text-accent border border-accent/20"
                    : "text-text hover:text-text-strong hover:bg-panel border border-transparent"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="text-[11px] font-semibold font-sans">{item.label}</span>}
                {item.isActive && (
                  <span className="absolute left-0 top-[25%] bottom-[25%] w-[2.5px] bg-accent rounded-r-md" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle/Bottom panels */}
      <div className="flex flex-col gap-4.5 px-2.5">
        {!isCollapsed && (
          <>
            {/* Project Health Card */}
            <div className="bg-panel border border-border rounded-xl p-2.5 space-y-1.5 shadow-sm">
              <span className="text-[8px] font-mono font-bold uppercase text-muted tracking-wider block">Project Health</span>
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-success" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-text-strong font-sans leading-none">Excellent</span>
                  <span className="text-[8px] text-muted font-mono mt-0.5">100% clean</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-mono font-bold uppercase text-muted tracking-wider block select-none">Quick Actions</span>
              <div className="flex flex-col gap-1">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => onExecuteQuickAction && onExecuteQuickAction(action.id, action.label)}
                    className="w-full text-left p-1.5 rounded-lg border border-border hover:border-accent/20 hover:bg-panel text-[9px] text-text hover:text-text-strong transition-all font-mono flex items-center gap-1 select-none cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-accent shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* User context card */}
        <div className="border-t border-border pt-2.5 flex items-center gap-2 select-none overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent to-blue-400 flex items-center justify-center shrink-0 text-bg font-bold text-[10px] shadow border border-border">
            A
          </div>
          {!isCollapsed && (
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-[10px] font-bold text-text font-sans leading-tight truncate">Abhishek</span>
              <span className="text-[7.5px] font-mono text-accent uppercase font-bold tracking-wider leading-none mt-0.5">Pro Plan</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
