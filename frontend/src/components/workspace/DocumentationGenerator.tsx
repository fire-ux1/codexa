import { BookOpen, ArrowRight } from "lucide-react";

interface DocumentationGeneratorProps {
  activeFile: string | null | undefined;
  onTriggerAction: (prompt: string) => void;
}

export default function DocumentationGenerator({ activeFile, onTriggerAction }: DocumentationGeneratorProps) {
  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-accent" /> AI Documentation Generator
        </h3>
        <p className="text-[10px] text-muted font-sans">Build README files, inline comments, or API references docs.</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {[
          { label: "📝 Generate Inline Comments", action: "inline", desc: "Adds rich JSDoc/Docstring mappings on function definitions." },
          { label: "📖 Create API Reference Guide", action: "api", desc: "Formulates markdown document outlining endpoints parameters." },
          { label: "🚀 Generate setup README file", action: "readme", desc: "Builds comprehensive installation setup configurations guide." }
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => onTriggerAction && onTriggerAction(`Generate documentation of type '${item.action}' for target: ${activeFile || "the repository"}`)}
            className="p-3 bg-panel border border-border hover:border-accent/25 rounded-xl text-left flex justify-between gap-3 items-center transition-all cursor-pointer group shadow-sm"
          >
            <div className="space-y-0.5 truncate text-[10px] font-mono">
              <span className="font-bold text-text-strong block group-hover:text-accent transition-colors">{item.label}</span>
              <span className="text-muted text-[9px] block truncate">{item.desc}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
