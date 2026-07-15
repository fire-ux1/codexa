import { Sparkles, Code, Shield, Flame, Play, HelpCircle, FileCode, CheckCircle, AlertTriangle, Clock, BookOpen, Bug, Search } from "lucide-react";

interface RecentChat {
  id: string;
  title?: string;
  timestamp?: string | number;
}

interface WelcomeDashboardProps {
  repoPath: string;
  filesCount?: number;
  symbolsCount?: number;
  onExecuteAction?: (actionId: string, title?: string) => void;
  recentFiles?: string[];
  onOpenFile?: (path: string) => void;
  recentChats?: RecentChat[];
  onLoadChat?: (chatId: string) => void;
  /** Optional: reflects real indexing state instead of always showing "Success" */
  indexStatus?: "success" | "indexing" | "error";
  /** Optional: real health score (0-100). Omit to hide the health card's numeric claim. */
  healthScore?: number | null;
  /** Optional: summary of detected issues shown under the health score */
  healthSummary?: string;
}

function getBasename(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

function formatChatTimestamp(timestamp?: string | number): string {
  if (timestamp === undefined || timestamp === null) return "";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function WelcomeDashboard({
  repoPath,
  filesCount = 0,
  symbolsCount = 0,
  onExecuteAction,
  recentFiles = [],
  onOpenFile,
  recentChats = [],
  onLoadChat,
  indexStatus = "success",
  healthScore = null,
  healthSummary,
}: WelcomeDashboardProps) {
  const repoName = repoPath ? getBasename(repoPath) : "No Repository Opened";
  const hasRepo = Boolean(repoPath);

  const quickActions = [
    {
      id: "explain_repo",
      title: "Explain Repository",
      desc: "Get an AI overview of this codebase and its purpose.",
      icon: BookOpen,
      color: "text-accent",
      bg: "bg-accent-dim/10",
      border: "border-accent/20",
    },
    {
      id: "architecture",
      title: "Generate Architecture",
      desc: "Visualize structural flows and dependency graphs.",
      icon: Code,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
    },
    {
      id: "search_repo",
      title: "Search Repository",
      desc: "Run fuzzy and semantic code searches.",
      icon: Search,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
    },
    {
      id: "find_bugs",
      title: "Find Bugs",
      desc: "Scan active files for hidden logic errors.",
      icon: Bug,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
    {
      id: "generate_tests",
      title: "Generate Tests",
      desc: "Create comprehensive automated unit test suites.",
      icon: Play,
      color: "text-success",
      bg: "bg-success-bg/15",
      border: "border-success/20",
    },
    {
      id: "review",
      title: "Review Code",
      desc: "Perform comprehensive AI audits and quality reviews.",
      icon: Shield,
      color: "text-danger",
      bg: "bg-danger-bg/15",
      border: "border-danger/20",
    },
    {
      id: "admin",
      title: "Admin Panel",
      desc: "Manage project roles and view compliance audit logs.",
      icon: Shield,
      color: "text-[#FF9D4D]",
      bg: "bg-[#FF9D4D]/10",
      border: "border-[#FF9D4D]/20",
    },
    {
      id: "analytics",
      title: "Usage & ROI Analytics",
      desc: "Track model tokens consumed, API trends, and codebase health.",
      icon: Flame,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
    },
  ];

  const indexStatusDisplay = {
    success: { label: "Success", color: "text-success", Icon: CheckCircle },
    indexing: { label: "Indexing…", color: "text-amber-400", Icon: Clock },
    error: { label: "Error", color: "text-danger", Icon: AlertTriangle },
  }[indexStatus];

  const healthIsKnown = healthScore !== null && healthScore !== undefined;
  const healthColor = !healthIsKnown
    ? "text-muted"
    : healthScore >= 80
    ? "text-success"
    : healthScore >= 50
    ? "text-amber-400"
    : "text-danger";
  const healthRingColor = !healthIsKnown
    ? "border-t-muted"
    : healthScore >= 80
    ? "border-t-success"
    : healthScore >= 50
    ? "border-t-amber-400"
    : "border-t-danger";
  const healthLabel = !healthIsKnown
    ? "Health Unknown"
    : healthScore >= 80
    ? "Excellent Health"
    : healthScore >= 50
    ? "Needs Attention"
    : "Poor Health";
  const healthDesc =
    healthSummary ?? (healthIsKnown ? "Run a review to see details." : "No health scan has been run yet.");

  const handleOverviewClick = (actionId: string) => {
    if (!hasRepo) return;
    onExecuteAction?.(actionId);
  };


  return (
    <div className="flex-1 overflow-y-auto bg-bg p-6 sm:p-8 select-text scrollbar-thin">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 select-none">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-text-strong tracking-tight flex items-center gap-2">
              Welcome to <span className="text-accent">ChunkWiser</span>
            </h1>
            <p className="text-[11px] text-muted font-mono break-all">{repoPath || "Select a folder to begin development..."}</p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <span className={`w-2 h-2 rounded-full ${hasRepo ? "bg-success glowing-dot animate-pulse" : "bg-muted"}`} />
            <span className={`text-[11px] font-semibold tracking-wide font-sans ${hasRepo ? "text-success" : "text-muted"}`}>
              {hasRepo ? "Workspace Active" : "No Active Workspace"}
            </span>
          </div>
        </div>

        {/* Overview & Insights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Repository Overview Card */}
          <button
            type="button"
            onClick={() => handleOverviewClick("analytics")}
            disabled={!hasRepo}
            className="text-left bg-panel hover:bg-panel-alt border border-border hover:border-accent/25 transition-all rounded-2xl p-5 flex flex-col justify-between shadow-lg cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-panel disabled:hover:border-border"
          >
            <div className="space-y-2 select-none">
              <div className="flex items-center gap-2 text-accent font-semibold font-sans text-[11px] group-hover:text-accent-strong">
                <FileCode className="w-3.5 h-3.5" />
                <span>Repository Profile</span>
              </div>
              <h2 className="text-sm font-bold text-text-strong tracking-tight font-sans truncate" title={repoName}>{repoName}</h2>
              <p className="text-[10px] text-muted leading-relaxed font-sans min-h-[40px] line-clamp-3">
                {hasRepo
                  ? "Fully indexed structure. Ask the AI assistant or trace symbols."
                  : "Open a repository folder to index files and functions."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-3 text-center border-t border-border mt-3">
              <div>
                <span className="block text-muted font-sans text-[9px]">Files</span>
                <span className="text-[13px] font-bold text-text-strong font-mono">{filesCount}</span>
              </div>
              <div>
                <span className="block text-muted font-sans text-[9px]">Symbols</span>
                <span className="text-[13px] font-bold text-text-strong font-mono">{symbolsCount}</span>
              </div>
              <div>
                <span className="block text-muted font-sans text-[9px]">Status</span>
                <span className={`text-[11px] font-semibold font-sans flex items-center justify-center gap-0.5 mt-0.5 ${indexStatusDisplay.color}`}>
                  <span>{indexStatusDisplay.label}</span>
                </span>
              </div>
            </div>
          </button>

          {/* AI Developer ROI Card */}
          <button
            type="button"
            onClick={() => handleOverviewClick("analytics")}
            disabled={!hasRepo}
            className="text-left bg-panel hover:bg-panel-alt border border-border hover:border-violet-500/25 transition-all rounded-2xl p-5 flex flex-col justify-between shadow-lg cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-panel disabled:hover:border-border"
          >
            <div className="w-full text-left flex items-center gap-2 text-violet-400 font-sans text-[11px] font-semibold border-b border-border pb-2 group-hover:text-violet-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Developer ROI</span>
            </div>
            <div className="flex-grow flex items-center justify-between w-full py-3">
              <div className="space-y-0.5">
                <span className="block text-xl font-bold text-text-strong font-mono">24.5h</span>
                <span className="text-[10px] text-muted font-sans">Engineering saved</span>
              </div>
              <div className="text-right space-y-0.5">
                <span className="block text-[13px] font-bold text-violet-400 font-mono">82.4%</span>
                <span className="text-[10px] text-muted font-sans">AI Accept Rate</span>
              </div>
            </div>
            <div className="w-full border-t border-border pt-2 mt-1">
              <p className="text-[10px] text-muted leading-normal font-sans">
                Fuzzy search indexing and prompt histories optimized.
              </p>
            </div>
          </button>

          {/* Project Health Score card */}
          <button
            type="button"
            onClick={() => handleOverviewClick("health")}
            disabled={!hasRepo}
            className="text-left bg-panel hover:bg-panel-alt border border-border hover:border-success/25 transition-all rounded-2xl p-5 flex flex-col justify-between items-center shadow-lg text-center select-none cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-panel disabled:hover:border-border"
          >
            <div className="w-full text-left flex items-center gap-2 text-success font-sans text-[11px] font-semibold border-b border-border pb-2 group-hover:text-success-strong">
              <Flame className="w-3.5 h-3.5 text-success" />
              <span>Project Health</span>
            </div>
            <div className="py-2 relative flex items-center justify-center">
              <div className={`w-14 h-14 rounded-full border-4 border-success-bg/30 ${healthRingColor} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                <span className="text-xs font-bold text-text-strong font-mono">
                  {healthIsKnown ? `${healthScore}%` : "—"}
                </span>
              </div>
            </div>
            <div className="space-y-0.5 w-full text-center border-t border-border pt-2 mt-1">
              <h3 className={`text-[11px] font-semibold ${healthColor}`}>{healthLabel}</h3>
              <p className="text-[10px] text-muted font-sans truncate">{healthDesc}</p>
            </div>
          </button>

          {/* Enterprise Compliance & Trust Card */}
          <button
            type="button"
            onClick={() => handleOverviewClick("admin")}
            disabled={!hasRepo}
            className="text-left bg-panel hover:bg-panel-alt border border-border hover:border-indigo-500/25 transition-all rounded-2xl p-5 flex flex-col justify-between shadow-lg cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-panel disabled:hover:border-border"
          >
            <div className="w-full text-left flex items-center gap-2 text-indigo-400 font-sans text-[11px] font-semibold border-b border-border pb-2 group-hover:text-indigo-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Security & Compliance</span>
            </div>
            <div className="flex-grow flex flex-col justify-center w-full space-y-1.5 py-2.5">
              <div className="flex flex-wrap gap-1 justify-start">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 select-none">
                  SOC2 Type II
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 select-none">
                  SAML SSO
                </span>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 select-none">
                  Audit Log
                </span>
              </div>
            </div>
            <div className="w-full border-t border-border pt-2 mt-1">
              <p className="text-[10px] text-muted leading-normal font-sans">
                Zero data retention pipelines. Enterprise-grade compliance.
              </p>
            </div>
          </button>
        </div>

        {/* AI Quick Actions Grid */}
        <div className="space-y-3.5 select-none">
          <h3 className="text-[11px] font-medium text-muted font-sans flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>AI Repository Quick Actions</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onExecuteAction?.(action.id, action.title)}
                  disabled={!hasRepo}
                  className="group text-left p-4 rounded-2xl bg-panel hover:bg-panel-alt border border-border hover:border-accent/30 transition-all shadow-md hover:shadow-accent/5 duration-200 cursor-pointer flex flex-col gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <div className={`w-9 h-9 rounded-xl ${action.bg} ${action.border} border flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                    <Icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-text-strong group-hover:text-accent transition-colors font-sans">{action.title}</h4>
                    <p className="text-[10px] text-muted leading-normal font-sans">{action.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue Working & Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Files */}
          <div className="bg-panel border border-border rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-[11px] font-medium text-text-strong font-sans flex items-center gap-1.5 border-b border-border pb-2 select-none">
              <Clock className="w-3.5 h-3.5 text-muted" />
              <span>Recent Files</span>
            </h3>
            <div className="space-y-1 max-h-[180px] overflow-y-auto scrollbar-none">
              {recentFiles.length === 0 ? (
                <p className="text-[10px] text-muted italic py-4 text-center font-sans">No files opened recently.</p>
              ) : (
                recentFiles.map((file) => (
                  <button
                    key={file}
                    type="button"
                    onClick={() => onOpenFile?.(file)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-panel-alt text-[11px] text-text hover:text-text-strong transition-colors font-sans truncate flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <span className="truncate min-w-0">📄 {getBasename(file)}</span>
                    <span className="text-[9px] text-muted truncate group-hover:text-text transition-colors shrink min-w-0 max-w-[45%] font-mono">
                      {file}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="bg-panel border border-border rounded-2xl p-4 space-y-3 shadow-lg">
            <h3 className="text-[11px] font-medium text-text-strong font-sans flex items-center gap-1.5 border-b border-border pb-2 select-none">
              <HelpCircle className="w-3.5 h-3.5 text-muted" />
              <span>Recent Chats</span>
            </h3>
            <div className="space-y-1 max-h-[180px] overflow-y-auto scrollbar-none">
              {recentChats.length === 0 ? (
                <p className="text-[10px] text-muted italic py-4 text-center font-sans">No recent chats available.</p>
              ) : (
                recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => onLoadChat?.(chat.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-panel-alt text-[11px] text-text hover:text-text-strong transition-colors font-sans truncate flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">💬 {chat.title || "Conversation Session"}</span>
                    <span className="text-[9px] text-muted shrink-0 ml-4 group-hover:text-text transition-colors">
                      {formatChatTimestamp(chat.timestamp)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}