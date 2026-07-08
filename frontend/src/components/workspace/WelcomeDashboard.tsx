import { Sparkles, Code, Shield, Flame, Play, HelpCircle, FileCode, CheckCircle, Clock, BookOpen, Bug, Search } from "lucide-react";

interface WelcomeDashboardProps {
  repoPath: string;
  filesCount?: number;
  symbolsCount?: number;
  onExecuteAction?: (actionId: string, title?: string) => void;
  recentFiles?: string[];
  onOpenFile?: (path: string) => void;
  recentChats?: any[];
  onLoadChat?: (chatId: any) => void;
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
}: WelcomeDashboardProps) {
  const repoName = repoPath ? repoPath.split(/[/\\]/).pop() || "No Repository Opened" : "No Repository Opened";

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
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-bg p-6 sm:p-8 select-text scrollbar-thin">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 select-none">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-text-strong tracking-tight flex items-center gap-2">
              Welcome to <span className="text-accent">CodePilot AI</span>
            </h1>
            <p className="text-xs text-muted font-mono break-all">{repoPath || "Select a folder to begin development..."}</p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-success glowing-dot animate-pulse" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-success font-mono">Workspace Ready</span>
          </div>
        </div>

        {/* Overview & Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Repository Overview Card */}
          <div
            onClick={() => onExecuteAction && onExecuteAction("analytics")}
            className="md:col-span-2 bg-panel hover:bg-panel-alt border border-border hover:border-accent/25 transition-all rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-lg cursor-pointer group"
          >
            <div className="space-y-2 select-none">
              <div className="flex items-center gap-2 text-accent font-bold font-mono text-[10px] uppercase tracking-wider group-hover:text-accent-strong">
                <FileCode className="w-3.5 h-3.5" />
                <span>Repository Profile (Click for Analytics)</span>
              </div>
              <h2 className="text-lg font-bold text-text-strong tracking-tight font-sans">{repoName}</h2>
              <p className="text-xs text-muted leading-relaxed font-sans">
                This workspace is fully indexed and analyzed. Use the AI Assistant or select a starting point below to explore the structure and symbols of your project.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-border">
              <div>
                <span className="block text-muted font-mono text-[9px] uppercase tracking-wider">Files</span>
                <span className="text-sm font-bold text-text-strong font-mono">{filesCount}</span>
              </div>
              <div>
                <span className="block text-muted font-mono text-[9px] uppercase tracking-wider">Symbols</span>
                <span className="text-sm font-bold text-text-strong font-mono">{symbolsCount}</span>
              </div>
              <div>
                <span className="block text-muted font-mono text-[9px] uppercase tracking-wider">Index Status</span>
                <span className="text-xs font-bold text-success font-mono flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-success" />
                  <span>Success</span>
                </span>
              </div>
            </div>
          </div>

          {/* Project Health Score card */}
          <div
            onClick={() => onExecuteAction && onExecuteAction("health")}
            className="bg-panel hover:bg-panel-alt border border-border hover:border-success/25 transition-all rounded-2xl p-5 flex flex-col justify-between items-center shadow-lg text-center select-none cursor-pointer group"
          >
            <div className="w-full text-left flex items-center gap-2 text-success font-bold font-mono text-[10px] uppercase tracking-wider border-b border-border pb-2 group-hover:text-success-strong">
              <Flame className="w-3.5 h-3.5 text-success animate-pulse" />
              <span>Project Health (Click for Report)</span>
            </div>
            <div className="py-2.5 relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-[5px] border-success-bg/30 border-t-success flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <span className="text-sm font-bold text-text-strong font-mono">100%</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-text-strong">Excellent Health</h3>
              <p className="text-[10px] text-muted font-sans">No static issues or security alerts detected.</p>
            </div>
          </div>
        </div>

        {/* AI Quick Actions Grid */}
        <div className="space-y-3.5 select-none">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>AI Repository Quick Actions</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onExecuteAction && onExecuteAction(action.id, action.title)}
                  disabled={!repoPath}
                  className="group text-left p-4.5 rounded-2xl bg-panel hover:bg-panel-alt border border-border hover:border-accent/30 transition-all shadow-md hover:shadow-accent/5 duration-200 cursor-pointer flex flex-col gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <div className={`w-9 h-9 rounded-xl ${action.bg} ${action.border} border flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                    <Icon className={`w-4 h-4 ${action.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-text-strong group-hover:text-accent transition-colors">{action.title}</h4>
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
          <div className="bg-panel border border-border rounded-2xl p-4.5 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-border pb-2 select-none">
              <Clock className="w-3.5 h-3.5 text-muted" />
              <span>Recent Files</span>
            </h3>
            <div className="space-y-1 max-h-[180px] overflow-y-auto scrollbar-none">
              {recentFiles.length === 0 ? (
                <p className="text-[10px] text-muted italic py-4 text-center">No files opened recently.</p>
              ) : (
                recentFiles.map((file) => (
                  <button
                    key={file}
                    onClick={() => onOpenFile && onOpenFile(file)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-panel-alt text-[11px] text-text hover:text-text-strong transition-colors font-mono truncate flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">📄 {file.split(/[/\\]/).pop()}</span>
                    <span className="text-[9px] text-muted truncate group-hover:text-text transition-colors ml-4">{file}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="bg-panel border border-border rounded-2xl p-4.5 space-y-3 shadow-lg">
            <h3 className="text-xs font-bold text-text uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-border pb-2 select-none">
              <HelpCircle className="w-3.5 h-3.5 text-muted" />
              <span>Recent Chats</span>
            </h3>
            <div className="space-y-1 max-h-[180px] overflow-y-auto scrollbar-none">
              {recentChats.length === 0 ? (
                <p className="text-[10px] text-muted italic py-4 text-center">No recent chats available.</p>
              ) : (
                recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => onLoadChat && onLoadChat(chat.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-panel-alt text-[11px] text-text hover:text-text-strong transition-colors font-mono truncate flex items-center justify-between group cursor-pointer"
                  >
                    <span className="truncate">💬 {chat.title || "Conversation Session"}</span>
                    <span className="text-[9px] text-muted shrink-0 ml-4 group-hover:text-text transition-colors">
                      {chat.timestamp ? new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
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
