import { ArrowRight, Lightbulb } from "lucide-react";

interface RefactorAssistantProps {
  activeFile: string | null | undefined;
  onTriggerAction: (prompt: string) => void;
}

export default function RefactorAssistant({ activeFile, onTriggerAction }: RefactorAssistantProps) {
  const recommendations = activeFile
    ? [
        { title: "Extract validation checks", target: "auth_token", type: "function", benefit: "Improves readability & DRY" },
        { title: "Simplify nested loops", target: "ast_visitor", type: "complexity", benefit: "Reduces runtime cognitive complexity" }
      ]
    : [];

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-accent" /> AI Refactoring Assistant
        </h3>
        <p className="text-[10px] text-muted font-sans">AI recommendations to simplify logic structures.</p>
      </div>

      <div className="space-y-2.5">
        {recommendations.length === 0 ? (
          <p className="text-center italic text-muted text-[10px] py-4">No active refactoring recommendations.</p>
        ) : (
          recommendations.map((rec, idx) => (
            <div key={idx} className="p-3 bg-panel border border-border rounded-xl relative group space-y-1 shadow-sm">
              <h4 className="text-[10px] font-bold text-text-strong font-mono flex items-center justify-between">
                <span>{rec.title}</span>
                <span className="text-[8.5px] uppercase bg-panel-alt-2/65 px-1 rounded text-accent border border-border font-bold font-mono">
                  {rec.type}
                </span>
              </h4>
              <p className="text-[9.5px] text-muted font-sans">Benefit: {rec.benefit}</p>
              {onTriggerAction && (
                <button
                  onClick={() => onTriggerAction(`Refactor the logic for: ${rec.title} inside ${activeFile}`)}
                  className="mt-1.5 py-1 px-2.5 bg-accent-dim/15 hover:bg-accent-dim/25 border border-accent/25 text-accent font-bold rounded-lg text-[9px] font-mono transition-all flex items-center gap-1 cursor-pointer"
                >
                  Apply suggestion <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
