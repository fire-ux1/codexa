// @ts-nocheck
import { useState } from "react";
import { MessageSquare, Trash2, Pin } from "lucide-react";

export default function PinnedChats() {
  const [pinned, setPinned] = useState(() => {
    const saved = localStorage.getItem("workspace-pinned-chats");
    return saved ? JSON.parse(saved) : [
      { id: 1, title: "Explanation of JWT authentication workflow", prompt: "Explain how jwt tokens are verified using oauth schemes in fastapi." },
      { id: 2, title: "Test suite generator code setup", prompt: "Write test mock setups for the vector store endpoints." }
    ];
  });

  const savePinned = (updated) => {
    setPinned(updated);
    localStorage.setItem("workspace-pinned-chats", JSON.stringify(updated));
  };

  const removePin = (id) => {
    savePinned(pinned.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4 select-none text-left font-sans">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Pin className="w-4 h-4 text-indigo-400" /> Pinned AI Chats
        </h3>
        <p className="text-[10px] text-gray-500 font-sans">Access important AI assistant insights and saved questions.</p>
      </div>

      <div className="space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
        {pinned.length === 0 ? (
          <p className="text-center italic text-gray-600 text-[10px] py-4">No pinned chat sessions yet.</p>
        ) : (
          pinned.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-[#141822] border border-[#1c2230] hover:border-indigo-500/20 rounded-xl relative group flex justify-between items-start gap-3 transition-all"
            >
              <div className="space-y-1 truncate text-[10px] font-mono">
                <span className="font-bold text-white flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </span>
                <span className="text-gray-500 text-[9px] block truncate">{item.prompt}</span>
              </div>
              <button
                onClick={() => removePin(item.id)}
                className="p-1 rounded hover:bg-[#1f191b] border border-transparent hover:border-rose-500/10 text-gray-500 hover:text-rose-400 shrink-0 cursor-pointer"
                title="Unpin Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

