import { Folder, Search, GitBranch, Settings } from "lucide-react";

export default function ActivityBar({ activeActivity, onSelectActivity }) {
  const items = [
    { key: "repository", icon: Folder, tooltip: "Repository (Explorer)" },
    { key: "search", icon: Search, tooltip: "Universal Search" },
    { key: "git", icon: GitBranch, tooltip: "Git Source Control" },
    { key: "settings", icon: Settings, tooltip: "Settings" },
  ];

  return (
    <div className="w-[48px] shrink-0 bg-[#0c0f16] border-r border-[#1c2230] flex flex-col items-center py-4 justify-between select-none">
      {/* Primary Actions */}
      <div className="flex flex-col items-center gap-5 w-full">
        {items.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const isActive = activeActivity === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectActivity(item.key)}
              title={item.tooltip}
              className={`p-2.5 rounded-xl transition-all relative ${
                isActive
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#141822] border border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <span className="absolute left-0 top-[25%] bottom-[25%] w-[3px] bg-indigo-500 rounded-r-md" />
              )}
            </button>
          );
        })}
      </div>

      {/* Secondary Bottom Settings */}
      <div className="w-full flex justify-center">
        {items.slice(3).map((item) => {
          const Icon = item.icon;
          const isActive = activeActivity === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectActivity(item.key)}
              title={item.tooltip}
              className={`p-2.5 rounded-xl transition-all ${
                isActive
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-[#141822] border border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
