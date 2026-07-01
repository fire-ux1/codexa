import { IconLogout, IconTrash } from "../icons/Icons";

export default function Sidebar({
  user,
  history,
  repoPath,
  onSignOut,
  onClearWorkspace,
  onSelectRepo,
  onDeleteRepo,
}) {
  return (
    <div className="w-full md:w-[320px] bg-[#0b0f19]/80 border-r border-white/5 flex flex-col min-h-screen shrink-0 glass relative z-20">

      {/* User Info header card */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={user.avatar_url || "https://api.dicebear.com/7.x/bottts/svg?seed=user"}
            alt="Avatar"
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10"
          />
          <div className="truncate w-36">
            <p className="text-xs font-bold text-white truncate leading-none">{user.name}</p>
            <p className="text-[10px] text-gray-500 truncate mt-1 leading-none">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          title="Log Out"
          className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 border border-white/10 hover:border-rose-500/20 transition-all"
        >
          <IconLogout className="w-4 h-4" />
        </button>
      </div>

      {/* Index history catalog */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Indexed Repositories</h3>
          <button
            onClick={onClearWorkspace}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-all"
          >
            + Index New
          </button>
        </div>

        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-xs text-gray-600 italic py-4 text-center">No indexed repositories found.</p>
          ) : (
            history.map((repo) => {
              const isActive = repoPath === repo.repository_path;
              return (
                <div
                  key={repo.id}
                  onClick={() => repo.status === "completed" && onSelectRepo(repo)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "bg-indigo-600/10 border-indigo-500 text-white font-medium shadow-md shadow-indigo-600/5"
                      : repo.status === "completed"
                      ? "bg-white/2.5 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/5"
                      : "bg-white/1 border-white/5 opacity-60 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate w-[190px]">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      repo.status === "completed" ? "bg-emerald-500" :
                      repo.status === "indexing" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                    }`} />
                    <div className="truncate">
                      <p className="text-xs truncate">{repo.repository_name}</p>
                      <p className="text-[9px] text-gray-500 truncate mt-0.5">{repo.branch}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => onDeleteRepo(e, repo.id)}
                    className="p-1.5 rounded hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all ml-1 shrink-0"
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
      <div className="p-4 border-t border-white/5 bg-black/20 text-center">
        <p className="text-[9px] font-mono text-gray-500">CodePilot AI Engine v1.1</p>
      </div>
    </div>
  );
}
