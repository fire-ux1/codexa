// @ts-nocheck
import { RefreshCw, FileText, ArrowRight } from "lucide-react";

export default function MemoryManager({ onOpenFile, onTriggerAction }) {
  const recentSessions = [
    { title: "Review Auth validation logic", file: "backend/api/auth.py", type: "review" },
    { title: "Refactor SQLite vectors loader", file: "backend/vector_store/chroma_service.py", type: "refactor" }
  ];

  return (
    <div className="space-y-4 select-none text-left font-sans">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-indigo-400" /> Session Resume Memory
        </h3>
        <p className="text-[10px] text-gray-500 font-sans">Re-open recently closed files or continue previous chats.</p>
      </div>

      <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
        {recentSessions.map((session, idx) => (
          <div key={idx} className="p-3 bg-[#141822] border border-[#1c2230] hover:border-indigo-500/10 rounded-xl flex items-center justify-between gap-3 text-[10px] font-mono transition-all">
            <div className="space-y-0.5 truncate">
              <span className="font-bold text-white block truncate">{session.title}</span>
              <span className="text-gray-500 text-[9px] block truncate">{session.file}</span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {onOpenFile && (
                <button
                  onClick={() => onOpenFile(session.file)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                  title="Open File Location"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )}
              {onTriggerAction && (
                <button
                  onClick={() => onTriggerAction(`Continue last session: ${session.title}`)}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                  title="Resume Discussion"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

