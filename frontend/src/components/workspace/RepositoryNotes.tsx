// @ts-nocheck
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export default function RepositoryNotes() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("workspace-notes");
    return saved ? JSON.parse(saved) : [
      { id: 1, title: "DB connection fix", content: "Need to replace sync SQLite handles with async AsyncSession in fastapi." },
      { id: 2, title: "Auth token secret", content: "Move secret token generation parameters to docker env config." }
    ];
  });
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const saveNotes = (updated) => {
    setNotes(updated);
    localStorage.setItem("workspace-notes", JSON.stringify(updated));
  };

  const addNote = () => {
    if (!newTitle.trim()) return;
    const newNote = {
      id: Date.now(),
      title: newTitle,
      content: newContent,
    };
    saveNotes([newNote, ...notes]);
    setNewTitle("");
    setNewContent("");
  };

  const deleteNote = (id) => {
    saveNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-4 select-none text-left font-sans">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Repository Developer Notes</h3>
        <p className="text-[10px] text-gray-500 font-sans">Jot down snippets, ideas, and system refactoring comments.</p>
      </div>

      {/* Note Form */}
      <div className="p-3 bg-[#141822] border border-[#1c2230] rounded-2xl space-y-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full bg-[#0c0f16] border border-[#1c2230] rounded-xl px-2.5 py-1 text-[10.5px] font-mono text-white placeholder-gray-600 focus:outline-none"
        />
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Write note content..."
          rows="2"
          className="w-full bg-[#0c0f16] border border-[#1c2230] rounded-xl px-2.5 py-1 text-[10.5px] font-mono text-white placeholder-gray-600 focus:outline-none resize-none"
        />
        <button
          onClick={addNote}
          className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[9.5px] font-mono transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Save Note
        </button>
      </div>

      {/* Note List */}
      <div className="space-y-2 max-h-[170px] overflow-y-auto scrollbar-thin pr-1">
        {notes.length === 0 ? (
          <p className="text-center italic text-gray-600 text-[10px] py-4">No developer notes created yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-3 bg-[#0f1219] border border-[#1c2230] rounded-xl relative group">
              <button
                onClick={() => deleteNote(note.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <h4 className="text-[10px] font-bold text-white font-mono">{note.title}</h4>
              <p className="text-[9.5px] text-gray-400 leading-relaxed mt-1 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

