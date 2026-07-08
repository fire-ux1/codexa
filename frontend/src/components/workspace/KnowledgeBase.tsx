// @ts-nocheck
import { FileText, Compass } from "lucide-react";

export default function KnowledgeBase() {
  const architectures = [
    { title: "FastAPI Backend Architecture", desc: "Layered configuration model separation: API route routes, vector store database connectors, and AST analyzer parsers." },
    { title: "Chroma Vector DB Store", desc: "SQLite metadata collections and embedding mappings. Indexed file chunks references." },
    { title: "Dependency Diagnostics Check", desc: "Circular imports resolved in api settings loader parameters. Zero critical leaks." }
  ];

  return (
    <div className="space-y-4 select-none text-left font-sans">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-indigo-400" /> Compiled System Knowledge
        </h3>
        <p className="text-[10px] text-gray-500 font-sans">Auto-distilled codebase indexes, package maps, and structure logs.</p>
      </div>

      <div className="space-y-2.5 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
        {architectures.map((arch, idx) => (
          <div key={idx} className="p-3.5 bg-[#141822] border border-[#1c2230] rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-indigo-400">
              <FileText className="w-3.5 h-3.5" />
              <span>{arch.title}</span>
            </div>
            <p className="text-[9.5px] text-gray-400 leading-relaxed font-mono">{arch.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

