import { useState, useEffect } from "react";
import { Clock, Bot, GitBranch, Search, FileCode, Server, AlertCircle } from "lucide-react";

interface TimelineItem {
  id: string;
  category: string;
  icon: React.ElementType;
  iconColor: string;
  bg: string;
  title: string;
  detail: string;
  time: string;
  timestamp: number;
  action?: () => void;
}

interface ActivityTimelineProps {
  recentFiles?: string[];
  recentChats?: any[];
  onOpenFile?: (file: string) => void;
  onLoadChat?: (chatId: any) => void;
}

export default function ActivityTimeline({
  recentFiles = [],
  recentChats = [],
  onOpenFile,
  onLoadChat,
}: ActivityTimelineProps) {
  const [filter, setFilter] = useState<string>("all");
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);

  useEffect(() => {
    const items: TimelineItem[] = [];

    recentFiles.forEach((file, index) => {
      const fileName = file.split(/[/\\]/).pop() || file;
      items.push({
        id: `file-${index}`,
        category: "repo",
        icon: FileCode,
        iconColor: "text-blue-400",
        bg: "bg-blue-500/10",
        title: `Opened file ${fileName}`,
        detail: file,
        time: "Just now",
        timestamp: Date.now() - index * 60000,
        action: () => onOpenFile && onOpenFile(file),
      });
    });

    recentChats.forEach((chat, index) => {
      items.push({
        id: `chat-${chat.id || index}`,
        category: "ai",
        icon: Bot,
        iconColor: "text-accent",
        bg: "bg-accent-dim/10",
        title: `AI Assistant Chat: ${chat.title || "Query Session"}`,
        detail: chat.model || "Gemini 1.5 Pro",
        time: chat.timestamp ? new Date(chat.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "5m ago",
        timestamp: chat.timestamp || (Date.now() - 300000 - index * 600000),
        action: () => onLoadChat && onLoadChat(chat.id),
      });
    });

    items.push({ id: "git-sync-1", category: "git", icon: GitBranch, iconColor: "text-success", bg: "bg-success-bg/15", title: "Git synchronized branch main", detail: "Synced commits with origin/main", time: "10m ago", timestamp: Date.now() - 600000 });
    items.push({ id: "index-success-1", category: "repo", icon: Server, iconColor: "text-cyan-400", bg: "bg-cyan-500/10", title: "Indexed codebase successfully", detail: `${recentFiles.length || 44} files indexed in vector database`, time: "1h ago", timestamp: Date.now() - 3600000 });
    items.push({ id: "search-query-1", category: "search", icon: Search, iconColor: "text-orange-400", bg: "bg-orange-500/10", title: "Run global workspace search", detail: "Queried 'db connection string'", time: "2h ago", timestamp: Date.now() - 7200000 });
    items.push({ id: "linter-err-1", category: "errors", icon: AlertCircle, iconColor: "text-danger", bg: "bg-danger-bg/15", title: "Uvicorn reloader crash warning", detail: "Address already in use 127.0.0.1:8000", time: "4h ago", timestamp: Date.now() - 14400000 });

    items.sort((a, b) => b.timestamp - a.timestamp);
    setTimelineItems(items);
  }, [recentFiles, recentChats, onOpenFile, onLoadChat]);

  const filteredItems = timelineItems.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  const filterButtons = [
    { key: "all", label: "All Events" },
    { key: "ai", label: "AI Chats" },
    { key: "git", label: "Git Updates" },
    { key: "repo", label: "Workspace" },
    { key: "errors", label: "Warnings" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg select-none">
      
      <div className="p-3 border-b border-border bg-panel flex items-center justify-between shrink-0">
        <span className="text-[9px] uppercase font-bold tracking-widest text-muted font-mono">Workspace Timeline</span>
        <Clock className="w-3.5 h-3.5 text-muted" />
      </div>

      <div className="px-2 py-1.5 border-b border-border flex gap-1 overflow-x-auto shrink-0 scrollbar-none bg-bg/40">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all border shrink-0 cursor-pointer ${
              filter === btn.key
                ? "bg-accent-dim/10 border-accent/20 text-accent"
                : "bg-transparent border-transparent text-muted hover:text-text"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin min-h-0">
        {filteredItems.length === 0 ? (
          <p className="text-[10px] text-muted italic text-center py-8 font-mono">No timeline events match filter.</p>
        ) : (
          filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => item.action && item.action()}
                className={`flex gap-3 text-left group transition-all rounded-lg p-1.5 ${
                  item.action ? "hover:bg-panel-alt cursor-pointer" : ""
                }`}
              >
                <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <div className="flex justify-between items-baseline gap-2">
                    <h4 className="text-[10px] font-bold text-text group-hover:text-text-strong transition-colors truncate">
                      {item.title}
                    </h4>
                    <span className="text-[8px] text-muted shrink-0 font-mono">{item.time}</span>
                  </div>
                  <p className="text-[9px] text-muted truncate leading-normal">{item.detail}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
