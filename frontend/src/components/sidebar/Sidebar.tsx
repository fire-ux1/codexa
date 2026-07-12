import { IconLogout, IconTrash } from "../icons/Icons";

interface User {
  avatar_url?: string;
  name: string;
  email: string;
}

interface RepoHistoryItem {
  id: string | number;
  repository_path: string;
  repository_name: string;
  branch?: string;
  status: "completed" | "indexing" | "failed";
  [key: string]: any;
}

interface SidebarProps {
  user: User;
  history: RepoHistoryItem[];
  repoPath: string;
  onSignOut: () => void;
  onClearWorkspace: () => void;
  onSelectRepo: (repo: RepoHistoryItem) => void;
  onDeleteRepo: (e: React.MouseEvent, repoId: string | number) => void;
}

export default function Sidebar({
  user,
  history,
  repoPath,
  onSignOut,
  onClearWorkspace,
  onSelectRepo,
  onDeleteRepo,
}: SidebarProps) {
  return (
    <div className="w-full md:w-[320px] bg-panel/80 border-r border-border flex flex-col min-h-screen shrink-0 glass relative z-20">

      {/* User Info header card */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={user.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=user"}
            alt="Avatar"
            className="w-10 h-10 rounded-xl bg-panel-alt border border-border"
          />
          <div className="truncate w-36">
            <p className="text-xs font-bold text-text-strong truncate leading-none">{user.name}</p>
            <p className="text-[10px] text-muted truncate mt-1 leading-none">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          title="Log Out"
          aria-label="Log Out"
          className="p-2 rounded-lg bg-panel-alt hover:bg-danger-bg text-muted hover:text-danger border border-border hover:border-danger/20 transition-all cursor-pointer"
        >
          <IconLogout className="w-4 h-4" />
        </button>
      </div>

      {/* Index history catalog */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4 scrollbar-thin">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase font-bold tracking-wider text-muted">Indexed Repositories</h3>
          <button
            onClick={onClearWorkspace}
            className="text-[10px] text-accent hover:text-accent-strong font-semibold transition-all cursor-pointer"
          >
            + Index New
          </button>
        </div>

        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-xs text-muted italic py-4 text-center">No indexed repositories found.</p>
          ) : (
            history.map((repo) => {
              const isActive = repoPath === repo.repository_path;
              return (
                <div
                  key={repo.id}
                  onClick={() => repo.status === "completed" && onSelectRepo(repo)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "bg-accent-dim/15 border-accent text-text-strong font-medium shadow-md shadow-accent/5"
                      : repo.status === "completed"
                      ? "bg-panel border-border text-muted hover:text-text-strong hover:bg-panel-alt"
                      : "bg-panel border-border opacity-50 text-muted cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate w-[190px]">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      repo.status === "completed" ? "bg-success" :
                      repo.status === "indexing" ? "bg-accent animate-pulse" : "bg-danger"
                    }`} />
                    <div className="truncate">
                      <p className="text-xs truncate text-text-strong">{repo.repository_name}</p>
                      <p className="text-[9px] text-muted truncate mt-0.5">{repo.branch}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => onDeleteRepo(e, repo.id)}
                    title="Delete repository"
                    aria-label={`Delete repository ${repo.repository_name}`}
                    className="p-1.5 rounded hover:bg-danger-bg text-muted hover:text-danger transition-all ml-1 shrink-0 cursor-pointer"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Brand version stamp */}
      <div className="p-4 border-t border-border bg-bg text-center">
        <p className="text-[9px] font-mono text-muted">CodePilot AI Engine v1.1</p>
      </div>
    </div>
  );
}
