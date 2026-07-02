import { IconSparkles, IconLink, IconDatabase, IconCheck } from "../icons/Icons";
import WelcomeChecklist from "./WelcomeChecklist";

export default function OnboardingPanel({
  indexingProgress,
  repoUrl,
  setRepoUrl,
  isCloning,
  onIndexRepository,
}) {
  const steps = [
    { id: "scan", label: "Scanning repository" },
    { id: "read", label: "Reading and chunking files" },
    { id: "embed", label: "Generating embeddings" },
    { id: "save", label: "Saving index" }
  ];

  const getStepState = (stepId, progress, stage) => {
    if (stage === "Failed") return "failed";
    
    switch (stepId) {
      case "scan":
        if (progress > 30 || ["Chunk generation", "Generating embeddings", "Completed"].includes(stage)) return "completed";
        if (stage === "Repository validation" || stage === "Scanning files") return "active";
        return "pending";
      case "read":
        if (progress > 40 || ["Generating embeddings", "Completed"].includes(stage)) return "completed";
        if (stage === "Chunk generation") return "active";
        return "pending";
      case "embed":
        if (progress > 95 || ["Completed"].includes(stage)) return "completed";
        if (stage === "Generating embeddings") return "active";
        return "pending";
      case "save":
        if (stage === "Completed" || progress === 100) return "completed";
        if (stage === "Generating embeddings" && progress > 90) return "active";
        return "pending";
      default:
        return "pending";
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto my-12">
      {indexingProgress ? (
        <div className="p-8 rounded-3xl border border-white/10 bg-gray-900/50 backdrop-blur-xl shadow-2xl glass space-y-6">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2.5">
              <span className="w-4 h-4 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></span>
              {indexingProgress.stage}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed font-mono">{indexingProgress.message}</p>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold inline-block py-1 px-2.5 uppercase rounded-full bg-indigo-500/20 text-indigo-300">
                  Progress Stage
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-indigo-300 font-mono">
                  {indexingProgress.progress}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-white/5 border border-white/5">
              <div
                style={{ width: `${indexingProgress.progress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-300"
              ></div>
            </div>
          </div>

          {/* Steps Checklist */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2 font-mono">
              Indexing Stages
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {steps.map((step) => {
                const state = getStepState(step.id, indexingProgress.progress, indexingProgress.stage);
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                      state === "completed"
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                        : state === "active"
                        ? "bg-indigo-500/5 border-indigo-500/30 text-indigo-300 animate-pulse-glow"
                        : "bg-white/2 border-white/5 text-gray-500"
                    }`}
                  >
                    {state === "completed" ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <IconCheck className="w-3.5 h-3.5" />
                      </span>
                    ) : state === "active" ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                        <span className="w-2.5 h-2.5 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></span>
                      </span>
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full border border-white/10 flex items-center justify-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-transparent"></span>
                      </span>
                    )}
                    <span className="text-xs font-semibold tracking-wide font-mono truncate">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <IconSparkles className="w-3.5 h-3.5" /> Workspace Configured
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-indigo-400 tracking-tight">
              Analyze codebases instantly.
            </h1>
            <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
              Clones repositories into a secure local sandbox, generates call graphs, parses imports, and connects dynamic streaming models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Input Card */}
            <div className="md:col-span-2 p-8 rounded-3xl border border-white/10 bg-gray-900/50 backdrop-blur-xl shadow-2xl relative overflow-hidden glass">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2.5">
                    Repository URL (GitHub or HTTPS Git endpoints)
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                      <IconLink className="w-5 h-5 text-indigo-400" />
                    </div>
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      disabled={isCloning}
                      className="block w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-white/10 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 text-white placeholder-gray-500 focus:outline-none transition-all font-mono text-[14px]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={onIndexRepository}
                    disabled={isCloning || !repoUrl.trim()}
                    className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold text-sm transition-all duration-150 flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                  >
                    {isCloning ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        Configuring Indexer...
                      </>
                    ) : (
                      <>
                        <IconDatabase className="w-4 h-4" />
                        Clone + Index Repository
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setRepoUrl("https://github.com/abhishek-s12/codepilot-ai")}
                    className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-all border border-white/10 hover:border-white/20"
                  >
                    Try Sample Repository
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist Card */}
            <div className="md:col-span-1">
              <WelcomeChecklist repoUrl={repoUrl} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
