import { useState, useCallback, useRef, KeyboardEvent } from "react";
import { Keyboard, Edit3, Check, X, AlertTriangle } from "lucide-react";

interface Shortcut {
  id: string;
  name: string;
  key: string;
}

interface KeyboardShortcutPanelProps {
  /** Optional: seed shortcuts from a parent/persisted source instead of the built-in defaults */
  initialShortcuts?: Shortcut[];
  /** Optional: called whenever a shortcut is successfully rebound, so the parent can persist it */
  onShortcutChange?: (id: string, newKey: string) => void;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "toggle_ai", name: "Toggle AI Panel", key: "Ctrl+L" },
  { id: "command_palette", name: "Open Command Palette", key: "Ctrl+P" },
  { id: "compile_graph", name: "Re-Compile Dependency Graph", key: "Ctrl+Shift+G" },
  { id: "explain_symbol", name: "Explain Selected Symbol", key: "Alt+E" },
  { id: "run_build", name: "Execute Project Build", key: "Ctrl+F5" },
];

// Keys that shouldn't count as a completed binding on their own
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

function formatKeyCombo(e: KeyboardEvent<HTMLInputElement>): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;

  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.metaKey) parts.push("Cmd");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  // Normalize the main key's display form
  let mainKey = e.key;
  if (mainKey === " ") mainKey = "Space";
  else if (mainKey.length === 1) mainKey = mainKey.toUpperCase();
  // Function keys, Arrow keys, Escape, etc. keep their e.key value as-is (e.g. "F5", "ArrowUp")

  parts.push(mainKey);
  return parts.join("+");
}

export default function KeyboardShortcutPanel({
  initialShortcuts = DEFAULT_SHORTCUTS,
  onShortcutChange,
}: KeyboardShortcutPanelProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(initialShortcuts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [capturedKey, setCapturedKey] = useState<string>("");
  const [conflictId, setConflictId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (id: string, currentKey: string) => {
    setEditingId(id);
    setCapturedKey(currentKey);
    setConflictId(null);
    // Focus the capture input on the next tick so it's ready to record immediately
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setCapturedKey("");
    setConflictId(null);
  }, []);

  const findConflict = (id: string, key: string): Shortcut | undefined =>
    shortcuts.find((s) => s.id !== id && s.key.toLowerCase() === key.toLowerCase());

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (e.key === "Escape") {
      cancelEdit();
      return;
    }

    const combo = formatKeyCombo(e);
    if (!combo) return; // modifier-only keydown, wait for the real key

    setCapturedKey(combo);
    if (editingId) {
      const conflict = findConflict(editingId, combo);
      setConflictId(conflict ? conflict.id : null);
    }
  };

  const saveShortcut = (id: string) => {
    if (!capturedKey) return;
    const conflict = findConflict(id, capturedKey);
    if (conflict) {
      setConflictId(conflict.id);
      return; // block save until the user picks a non-conflicting combo
    }

    setShortcuts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, key: capturedKey } : s))
    );
    onShortcutChange?.(id, capturedKey);
    setEditingId(null);
    setCapturedKey("");
    setConflictId(null);
  };

  const conflictingShortcutName = conflictId
    ? shortcuts.find((s) => s.id === conflictId)?.name
    : null;

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
          const hasConflict = isEditing && conflictId !== null;

          return (
            <div key={shortcut.id} className="space-y-1">
              <div
                className={`p-3 bg-[#141822] border rounded-xl flex items-center justify-between gap-3 text-[10px] font-mono transition-colors ${
                  hasConflict ? "border-rose-500/40" : "border-[#1c2230]"
                }`}
              >
                <span className="text-gray-300 font-bold">{shortcut.name}</span>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={capturedKey}
                      onKeyDown={handleKeyDown}
                      readOnly
                      aria-label={`Press a new key combination for ${shortcut.name}`}
                      className={`px-2 py-0.5 rounded bg-[#0c0f16] border text-white font-bold w-28 text-center focus:outline-none cursor-text ${
                        hasConflict ? "border-rose-500/60" : "border-indigo-500/40 focus:border-indigo-500"
                      }`}
                      placeholder="Press keys…"
                    />
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                      {shortcut.key}
                    </span>
                  )}

                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveShortcut(shortcut.id)}
                        disabled={!capturedKey || hasConflict}
                        aria-label={`Save shortcut for ${shortcut.name}`}
                        className="p-1 rounded bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 text-emerald-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        aria-label={`Cancel editing shortcut for ${shortcut.name}`}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(shortcut.id, shortcut.key)}
                      disabled={editingId !== null}
                      aria-label={`Edit shortcut for ${shortcut.name}`}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {hasConflict && (
                <p className="flex items-center gap-1 text-[9px] text-rose-400 font-mono pl-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Already used by "{conflictingShortcutName}" — choose a different combination.</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}