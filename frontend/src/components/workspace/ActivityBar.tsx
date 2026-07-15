import {
  Folder, Search, Network, Bot, History, Settings,
  FileCode, ClipboardCheck, Activity,
} from "lucide-react";

const ACTIVITY_BAR_WIDTH = "48px";

interface ActivityBarProps {
  activeActivity: string;
  onSelectActivity: (activity: string) => void;
  activeMode: string;
  onSelectMode: (mode: string) => void;
  rightTab: string;
  onSelectRightTab: (tab: string) => void;
  onToggleRightSidebar: (collapsed: boolean) => void;
  /** Current user identity, replacing the hardcoded "Abhishek" */
  userName?: string;
  userPlan?: string;
  userAvatarUrl?: string;
}

interface NavItem {
  key: string;
  label: string;
  icon: typeof Folder;
  isActive: boolean;
  onClick: () => void;
}

export default function ActivityBar({
  activeActivity,
  onSelectActivity,
  activeMode,
  onSelectMode,
  rightTab,
  onSelectRightTab,
  onToggleRightSidebar,
  userName = "Guest",
  userPlan,
  userAvatarUrl,
}: ActivityBarProps) {
  // Primary group — the 6 core nav destinations called out in the design
  // spec (Explorer, Search, Graph, Agents, History, Settings). Selecting
  // Explorer/Search/History/Settings also returns to editor mode, matching
  // previous behavior; Graph and Agents switch mode/right-tab directly.
  const navItems: NavItem[] = [
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
      // Covers both the graph view and its trace sub-view, as before
      isActive: activeMode === "understand" || activeMode === "trace",
      onClick: () => onSelectMode("understand"),
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

  // Secondary group: remaining workspace modes not covered by the design
  // spec's 6-icon list. Kept separate (rather than deleted) so switching
  // into Editor/Review/Trace mode doesn't lose a reachable entry point —
  // the spec doesn't mention these, so this is a conservative choice to
  // avoid a navigation regression rather than a literal spec requirement.
  // TODO — confirm the real mode string for "Review" against wherever
  // activeMode is set (likely AIWorkspace.tsx); "review" below is a guess.
  const modeItems: NavItem[] = [
    {
      key: "editor",
      label: "Editor",
      icon: FileCode,
      isActive: activeMode === "editor",
      onClick: () => onSelectMode("editor"),
    },
    {
      key: "review",
      label: "Review",
      icon: ClipboardCheck,
      isActive: activeMode === "review",
      onClick: () => onSelectMode("review"),
    },
    {
      key: "trace",
      label: "Trace",
      icon: Activity,
      isActive: activeMode === "trace",
      onClick: () => onSelectMode("trace"),
    },
  ];

  const userInitial = userName.trim().charAt(0).toUpperCase() || "?";
  const userTitle = userPlan ? `${userName} — ${userPlan}` : userName;

  const renderNavButton = (item: NavItem, ariaMode: "nav" | "toggle") => {
    const Icon = item.icon;
    return (
      <button
        key={item.key}
        type="button"
        onClick={item.onClick}
        aria-label={item.label}
        {...(ariaMode === "nav"
          ? { "aria-current": item.isActive ? ("page" as const) : undefined }
          : { "aria-pressed": item.isActive })}
        title={item.label}
        className={`flex items-center justify-center p-2.5 rounded-xl transition-all relative cursor-pointer ${
          item.isActive
            ? "bg-accent-dim/15 text-accent border border-accent/20"
            : "text-text hover:text-text-strong hover:bg-panel border border-transparent"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {item.isActive && (
          <span aria-hidden="true" className="absolute left-0 top-[25%] bottom-[25%] w-[2.5px] bg-accent rounded-r-md" />
        )}
      </button>
    );
  };

  return (
    <div
      style={{ width: ACTIVITY_BAR_WIDTH }}
      className="shrink-0 bg-[var(--activity-bar-bg,var(--bg))] border-r border-border flex flex-col justify-between select-none py-3 z-20 h-full overflow-hidden shadow-sm"
    >
      <div className="flex flex-col gap-3">
        <nav aria-label="Primary" className="flex flex-col gap-1.5 px-1.5">
          {navItems.map((item) => renderNavButton(item, "nav"))}
        </nav>

        <div className="border-t border-border mx-2" aria-hidden="true" />

        <nav aria-label="Workspace mode" className="flex flex-col gap-1.5 px-1.5">
          {modeItems.map((item) => renderNavButton(item, "toggle"))}
        </nav>
      </div>

      {/* User context — avatar only; bar is always icon-width now */}
      <div className="border-t border-border pt-2.5 px-1.5 flex justify-center select-none" title={userTitle}>
        {userAvatarUrl ? (
          <img
            src={userAvatarUrl}
            alt={userName}
            className="w-7 h-7 rounded-full shrink-0 object-cover border border-border shadow"
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-7 h-7 rounded-full bg-gradient-to-tr from-accent to-blue-400 flex items-center justify-center shrink-0 text-bg font-bold text-[10px] shadow border border-border"
          >
            {userInitial}
          </div>
        )}
      </div>
    </div>
  );
}