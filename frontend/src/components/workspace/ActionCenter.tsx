import { useState, useEffect } from "react";
import { BookOpen, Play, Bug, Flame, Shield, HelpCircle, Code, ListCheck, Loader2 } from "lucide-react";

interface SuggestionItem {
  label: string;
  prompt: string;
}

interface WorkflowState {
  step: number;
  status: "running" | "done";
}

interface ActionCenterProps {
  activeFile: string | null | undefined;
  onTriggerAction: (prompt: string) => void;
  workflowState?: WorkflowState | null;
}

export default function ActionCenter({
  activeFile,
  onTriggerAction,
  workflowState = null,
}: ActionCenterProps) {
  const activeFileName = activeFile ? activeFile.split(/[\\/]/).pop() || "" : "";

  const smartActions = [
    {
      id: "explain",
      title: "Explain File",
      desc: "Understand file logic and its architecture role.",
      icon: BookOpen,
      color: "text-accent",
      bg: "bg-accent-dim/10",
      border: "border-accent/20",
      prompt: `Explain the file ${activeFileName || "active workspace"} and its structural flows.`,
    },
    {
      id: "tests",
      title: "Generate Tests",
      desc: "Produce unit tests for public declarations.",
      icon: Play,
      color: "text-success",
      bg: "bg-success-bg/15",
      border: "border-success/20",
      prompt: `Generate comprehensive unit tests for the functions in ${activeFileName || "active file"}.`,
    },
    {
      id: "bugs",
      title: "Find Bugs",
      desc: "Identify logical issues and memory leaks.",
      icon: Bug,
      color: "text-danger",
      bg: "bg-danger-bg/15",
      border: "border-danger/20",
      prompt: `Scan for hidden logical errors, syntax issues, and edge case bugs in ${activeFileName || "active file"}.`,
    },
    {
      id: "refactor",
      title: "Refactor Code",
      desc: "Improve cyclomatic complexity and readability.",
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      prompt: `Refactor the code in ${activeFileName || "active file"} to improve cyclomatic complexity and adhere to clean code principles.`,
    },
    {
      id: "doc",
      title: "Document File",
      desc: "Generate professional docstrings and summaries.",
      icon: Code,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      prompt: `Generate developer documentation, comments, and docstrings for ${activeFileName || "active file"}.`,
    },
    {
      id: "security",
      title: "Security Audit",
      desc: "Scan for raw secrets and vulnerable modules.",
      icon: Shield,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
      prompt: `Perform a security review of ${activeFileName || "active file"}. Look for hardcoded keys, secrets, injection vectors, and weak patterns.`,
    },
  ];

  const [contextSuggestions, setContextSuggestions] = useState<SuggestionItem[]>([]);

  useEffect(() => {
    if (!activeFile) {
      setContextSuggestions([
        {
          label: "Analyze Workspace Directory",
          prompt: "Analyze the active directory hierarchy and identify the main entry point and layer separations.",
        },
        {
          label: "Audit Configuration Diffs",
          prompt: "Examine active git status configurations and identify modified codeblocks.",
        },
      ]);
      return;
    }

    const ext = activeFile.split(".").pop()?.toLowerCase() || "";
    const fileName = activeFile.split(/[\\/]/).pop()?.toLowerCase() || "";

    if (fileName === "package.json") {
      setContextSuggestions([
        { label: "🔍 Explain Dependencies", prompt: "List all main packages in package.json and summarize what they are used for." },
        { label: "⚠️ Audit Package Security", prompt: "Scan package.json dependencies for known vulnerabilities and suggest version upgrades." },
        { label: "🗑️ Find Unused Libraries", prompt: "Analyze imports in the codebase and verify if any libraries in package.json are completely unused." },
      ]);
    } else if (fileName === "requirements.txt") {
      setContextSuggestions([
        { label: "🐍 Explain Python Packages", prompt: "Analyze requirements.txt and describe the role of each library listed." },
        { label: "📦 Verify Package Versions", prompt: "Review package listings in requirements.txt and check for legacy or incompatible versions." },
      ]);
    } else if (ext === "py") {
      setContextSuggestions([
        { label: "🧼 Review PEP-8 Conformity", prompt: "Inspect active python file and identify styling, typing, or linting deviations from PEP-8." },
        { label: "⚡ Optimize Python Imports", prompt: "Check import statements. Are there unused imports or modules that could be lazy loaded?" },
        { label: "🧩 Explain AST Chunking Structure", prompt: "Summarize the classes, methods, and decorators defined in this python module." },
      ]);
    } else if (["js", "jsx", "ts", "tsx"].includes(ext)) {
      setContextSuggestions([
        { label: "⚛️ Verify React Hooks Usage", prompt: "Review React hook dependency arrays, callback configurations, and potential infinite rendering loops." },
        { label: "🎨 Check CSS/Styling Classes", prompt: "Analyze CSS custom property mappings or Tailwind classes in this UI module to ensure consistent styling." },
        { label: "📦 Audit Export Definitions", prompt: "Scan default and named exports. Are there circular dependencies or invalid export paths?" },
      ]);
    } else {
      setContextSuggestions([
        { label: "📋 Explain File Semantics", prompt: `Summarize the contents, type, and purpose of the file ${fileName}.` },
        { label: "🔍 Search References", prompt: `Find all imports or usage calls references to the file ${fileName} in this codebase.` },
      ]);
    }
  }, [activeFile]);

  const workflowSteps = [
    "Reading file content & structure...",
    "Scanning AST nodes and definitions...",
    "Analyzing local imports & relationships...",
    "Compiling AI review recommendations...",
    "Formulating proposed improvements...",
  ];

  return (
    <div className="space-y-5 p-4 rounded-2xl bg-panel/30 border border-border select-none text-left shadow-sm">
      
      {/* Workflow Progress Stepper */}
      {workflowState && (
        <div className="bg-panel border border-border rounded-xl p-4.5 space-y-3.5 shadow animate-fade-in">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
            <span className="text-[10px] font-mono font-bold uppercase text-accent tracking-wider">
              Executing AI Workflow...
            </span>
          </div>

          <div className="space-y-2">
            {workflowSteps.map((stepText, idx) => {
              const isCompleted = idx < workflowState.step;
              const isCurrent = idx === workflowState.step;
              return (
                <div key={idx} className="flex items-center gap-2.5 text-[9.5px] font-mono">
                  {isCompleted ? (
                    <span className="text-success font-bold">✓</span>
                  ) : isCurrent ? (
                    <Loader2 className="w-3 h-3 text-accent animate-spin shrink-0" />
                  ) : (
                    <span className="text-muted font-bold">•</span>
                  )}
                  <span
                    className={
                      isCompleted
                        ? "text-muted line-through"
                        : isCurrent
                        ? "text-text-strong font-bold"
                        : "text-muted opacity-60"
                    }
                  >
                    {stepText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section heading */}
      <div className="flex items-center gap-1.5 text-accent font-bold font-mono text-[9px] uppercase tracking-widest border-b border-border pb-2">
        <ListCheck className="w-3.5 h-3.5" />
        <span>AI Workspace Actions</span>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {smartActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onTriggerAction(action.prompt)}
              className="group text-left p-3.5 rounded-xl bg-panel hover:bg-panel-alt border border-border hover:border-accent/25 transition-all shadow cursor-pointer flex flex-col gap-2.5 duration-200"
            >
              <div className={`w-8 h-8 rounded-lg ${action.bg} ${action.border} border flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${action.color}`} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-bold text-text-strong group-hover:text-accent transition-colors font-sans">{action.title}</h4>
                <p className="text-[8.5px] text-muted leading-normal font-sans">{action.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Context-Aware Suggestions Section */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-[8.5px] font-mono font-bold uppercase text-muted tracking-wider">
          <HelpCircle className="w-3 h-3 text-muted" />
          <span>Context Suggestions ({activeFileName || "Repo"})</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {contextSuggestions.map((suggest, idx) => (
            <button
              key={idx}
              onClick={() => onTriggerAction(suggest.prompt)}
              className="w-full text-left p-2 rounded-lg border border-border hover:border-accent/20 hover:bg-panel text-[9.5px] text-text hover:text-text-strong transition-all font-mono truncate cursor-pointer"
            >
              {suggest.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
