import { useState } from "react";
import { Play, Shield } from "lucide-react";

interface TestGeneratorProps {
  activeFile: string | null | undefined;
  onTriggerAction: (prompt: string) => void;
}

export default function TestGenerator({ activeFile, onTriggerAction }: TestGeneratorProps) {
  const [testFramework, setTestFramework] = useState<string>("pytest");

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-accent" /> AI Unit Test Generator
        </h3>
        <p className="text-[10px] text-muted font-sans">Generate automation tests suites with high coverage.</p>
      </div>

      {/* Selector */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[9px] uppercase font-bold text-muted tracking-wider font-mono">Test Framework Target</span>
        <div className="flex bg-panel border border-border p-1 rounded-xl shadow-inner">
          {[
            { id: "pytest", label: "PyTest (Python)" },
            { id: "jest", label: "Jest (React)" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setTestFramework(btn.id)}
              className={`flex-1 py-1 rounded-lg text-[9.5px] font-mono font-bold transition-all cursor-pointer ${
                testFramework === btn.id ? "bg-accent-dim/15 text-accent border border-accent/20" : "text-muted hover:text-text-strong"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 bg-panel border border-border rounded-xl space-y-1 text-[9.5px] font-mono text-muted shadow-sm select-text">
        <span className="font-bold text-text-strong block">Auto-Generated Mock Targets:</span>
        <p>• Mock dependencies parameters injection</p>
        <p>• Exception bounds boundary assertions</p>
        <p>• Edge case arrays configurations</p>
      </div>

      {activeFile && onTriggerAction && (
        <button
          onClick={() => onTriggerAction(`Generate unit tests suite in ${testFramework} for the functions defined in the file ${activeFile}`)}
          className="w-full py-2 bg-accent hover:bg-accent-strong text-bg font-bold rounded-xl text-[10px] font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-accent/15"
        >
          <Play className="w-3.5 h-3.5 text-success" /> Generate Test Suite
        </button>
      )}
    </div>
  );
}
