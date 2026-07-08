// @ts-nocheck
import { Sparkles } from "lucide-react";

export function AIInsightCards({ insights = [] }) {
  if (insights.length === 0) return null;

  const getInsightStyle = (type) => {
    switch (type) {
      case "security":
        return {
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
          badge: "Security Risk",
          icon: "ðŸ›¡ï¸",
        };
      case "smell":
        return {
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          badge: "Code Smell",
          icon: "âš ï¸",
        };
      case "debt":
        return {
          bg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
          badge: "Technical Debt",
          icon: "ðŸ’¸",
        };
      case "best_practice":
        return {
          bg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
          badge: "Best Practice",
          icon: "ðŸ’¡",
        };
      default:
        return {
          bg: "bg-gray-500/10 border-gray-500/20 text-gray-400",
          badge: "Insight",
          icon: "ðŸ“",
        };
    }
  };

  return (
    <div className="space-y-2 select-none text-left">
      <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">AI Static Code Insights</span>
      <div className="space-y-2.5">
        {insights.map((ins, idx) => {
          const style = getInsightStyle(ins.type);
          return (
            <div key={idx} className={`p-3.5 border rounded-2xl ${style.bg} flex gap-3 shadow-md animate-fade-in`}>
              <span className="text-sm shrink-0 mt-0.5">{style.icon}</span>
              <div className="space-y-1">
                <span className="text-[8.5px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/5 inline-block">
                  {style.badge}
                </span>
                <h4 className="text-[10px] font-bold text-white leading-snug">{ins.title}</h4>
                <p className="text-[9.5px] opacity-80 leading-relaxed font-sans">{ins.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SmartRecommendations({
  activeFile = "",
  onTriggerAction = () => {},
}) {
  const ext = activeFile.split(".").pop().toLowerCase();
  const fileName = activeFile.split(/[\\/]/).pop();

  const getSmartRecommendations = () => {
    const list = [
      { label: "ðŸ” Explain File Logic", prompt: `Explain the file ${fileName} and summarize its key operations.` },
      { label: "ðŸ§ª Generate Unit Tests", prompt: `Create comprehensive automated unit tests for functions defined in ${fileName}.` },
      { label: "ðŸ§¼ Review Code Quality", prompt: `Scan the file ${fileName} for code quality issues, style guidelines, and compliance.` },
    ];
    return list;
  };

  const getFrameworkAdvisor = () => {
    if (["js", "jsx", "ts", "tsx"].includes(ext)) {
      return {
        title: "React Framework Advisor",
        items: [
          { label: "âš›ï¸ Audit Hooks Dependencies", prompt: "Check React component hooks dependency arrays for loops or missing variables." },
          { label: "ðŸŽ¨ Clean CSS Classnames", prompt: "Verify if custom Tailwind classes or CSS variables align with workspace styles." },
        ],
      };
    }
    if (ext === "py") {
      return {
        title: "FastAPI / Python Advisor",
        items: [
          { label: "ðŸ Validate PEP-8 Formatting", prompt: "Review active python file structures for standard PEP-8 style guidelines." },
          { label: "ðŸ›¡ï¸ Audit API Security", prompt: "Inspect FastAPI route definitions for path authorization parameters." },
        ],
      };
    }
    return null;
  };

  const getAIInsights = () => {
    if (ext === "py") {
      return [
        {
          type: "security",
          title: "Vulnerable JWT token validation",
          description: "Secret keys should be fetched from environment properties. Hardcoded credentials detected in JWT decoder module.",
        },
        {
          type: "debt",
          title: "Database connection block latency",
          description: "Database queries are executing synchronously. Converting queries to async connections will improve execution throughput.",
        },
      ];
    }
    if (["js", "jsx", "ts", "tsx"].includes(ext)) {
      return [
        {
          type: "smell",
          title: "Cascading React Renders",
          description: "Effects updating states synchronously can cause performance issues. Wrap event dispatch handlers in useCallback declarations.",
        },
        {
          type: "best_practice",
          title: "Missing Prop Types definition",
          description: "TypeScript definitions or prop validation checks should be declared to enforce validation bounds during compiling.",
        },
      ];
    }
    return [
      {
        type: "best_practice",
        title: "Repository Documentation Gap",
        description: "Add markdown definitions explaining function interfaces and class bindings to build a robust documentation index.",
      },
    ];
  };

  const recommendations = getSmartRecommendations();
  const frameworkAdvisor = getFrameworkAdvisor();
  const insights = getAIInsights();

  return (
    <div className="space-y-5 p-4 rounded-2xl bg-[#0f1219]/30 border border-[#1c2230] text-left select-none animate-fade-in">
      
      {/* File Action suggestions */}
      <div className="space-y-2">
        <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider font-mono flex items-center gap-1.5 pb-1 border-b border-[#1c2230]/40">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Smart Suggestions ({fileName})
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {recommendations.map((rec, idx) => (
            <button
              key={idx}
              onClick={() => onTriggerAction(rec.prompt)}
              className="p-2 text-left rounded-xl bg-[#141822] hover:bg-[#1b212f] border border-[#1c2230] hover:border-indigo-500/20 text-gray-300 hover:text-white transition-all text-[9.5px] font-mono truncate"
            >
              {rec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Framework advisors */}
      {frameworkAdvisor && (
        <div className="space-y-2 pt-2 border-t border-[#1c2230]/40">
          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">
            {frameworkAdvisor.title}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {frameworkAdvisor.items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onTriggerAction(item.prompt)}
                className="p-2 text-left rounded-xl bg-[#0f1219] hover:bg-[#141822] border border-[#1c2230] text-[9.5px] text-gray-400 hover:text-white transition-all font-mono truncate"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Insight list */}
      {insights.length > 0 && (
        <div className="pt-2 border-t border-[#1c2230]/40">
          <AIInsightCards insights={insights} />
        </div>
      )}

    </div>
  );
}

