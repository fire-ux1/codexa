// @ts-nocheck
import { useState } from "react";
import { Keyboard, Edit3, Check } from "lucide-react";

export default function KeyboardShortcutPanel() {
  const [shortcuts, setShortcuts] = useState([
    { id: "toggle_ai", name: "Toggle AI Panel", key: "Ctrl + L" },
    { id: "command_palette", name: "Open Command Palette", key: "Ctrl + P" },
    { id: "compile_graph", name: "Re-Compile Dependency Graph", key: "Ctrl + Shift + G" },
    { id: "explain_symbol", name: "Explain Selected Symbol", key: "Alt + E" },
    { id: "run_build", name: "Execute Project Build", key: "Ctrl + F5" },
  ]);
  const [editingId, setEditingId] = useState(null);
  const [newKey, setNewKey] = useState("");

  const startEdit = (id, currentKey) => {
    setEditingId(id);
    setNewKey(currentKey);
  };

  const saveShortcut = (id) => {
    setShortcuts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, key: newKey } : s))
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-4 select-none text-left">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Keyboard className="w-4 h-4 text-indigo-400" /> Keyboard Shortcut Mappings
        </h3>
        <p className="text-[10px] text-gray-500">Configure hotkey bindings for core workspace actions.</p>
      </div>

      <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
        {shortcuts.map((shortcut) => {
          const isEditing = editingId === shortcut.id;
          return (
            <div
              key={shortcut.id}
              className="p-3 bg-[#141822] border border-[#1c2230] rounded-xl flex items-center justify-between gap-3 text-[10px] font-mono"
            >
              <span className="text-gray-300 font-bold">{shortcut.name}</span>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="px-2 py-0.5 rounded bg-[#0c0f16] border border-indigo-500/40 text-white font-bold w-24 text-center focus:outline-none focus:border-indigo-500"
                    placeholder="Press keys..."
                  />
                ) : (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                    {shortcut.key}
                  </span>
                )}

                {isEditing ? (
                  <button
                    onClick={() => saveShortcut(shortcut.id)}
                    className="p-1 rounded bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => startEdit(shortcut.id, shortcut.key)}
                    className="p-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

