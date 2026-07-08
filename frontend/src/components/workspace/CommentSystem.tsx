import { useState, useEffect } from "react";
import { MessageSquare, Plus, Trash2, Wifi, WifiOff } from "lucide-react";
import {
  fetchComments,
  addComment,
  deleteComment,
} from "../../services/collaboration";
import { useCollaborationSocket } from "../../hooks/useCollaborationSocket";

interface CommentSystemProps {
  activeFile: string | null | undefined;
}

export default function CommentSystem({ activeFile }: CommentSystemProps) {
  const fileLabel = activeFile ? activeFile.split(/[/\\]/).pop() || "Global" : "Global";
  const [newText, setNewText] = useState<string>("");

  const projectId = "default-project";
  const { store } = useCollaborationSocket(projectId);

  const [comments, setComments] = useState<any[]>(() => store.getState().comments);
  const [isConnected, setIsConnected] = useState<boolean>(() => store.getState().connected);

  useEffect(() => {
    // Subscribe to shared collaboration store updates
    const unsubscribe = store.subscribe((state) => {
      setComments(state.comments);
      setIsConnected(state.connected);
    });

    // Fetch initial comments from database
    fetchComments(projectId)
      .then((data) => {
        store.setComments(data || []);
      })
      .catch((err) => console.error("[CommentSystem] Fetch failed:", err));

    return () => {
      unsubscribe();
    };
  }, [store, projectId]);

  const handleAdd = () => {
    if (!newText.trim()) return;
    addComment(projectId, fileLabel, 0, newText)
      .then(() => {
        setNewText("");
      })
      .catch((err) => console.error("[CommentSystem] Post failed:", err));
  };

  const handleDelete = (id: string | number) => {
    deleteComment(String(id)).catch((err) =>
      console.error("[CommentSystem] Delete failed:", err)
    );
  };

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2 flex justify-between items-center select-none">
        <div>
          <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-accent" /> Codebase Comments
          </h3>
          <p className="text-[10px] text-muted font-sans">
            Line annotations and team comments on active files.
          </p>
        </div>

        {/* WebSocket Connection Status Widget */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-panel border border-border shadow-inner">
          {isConnected ? (
            <>
              <Wifi className="w-2.5 h-2.5 text-success animate-pulse" />
              <span className="text-[7.5px] font-mono font-bold text-success uppercase tracking-wider">
                Live
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-2.5 h-2.5 text-danger" />
              <span className="text-[7.5px] font-mono font-bold text-danger uppercase tracking-wider">
                Offline
              </span>
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={`Comment on ${fileLabel}...`}
          className="w-full bg-bg border border-border rounded-xl px-2.5 py-1 text-[10px] font-mono text-text-strong placeholder-muted focus:outline-none focus:border-accent/40 shadow-inner"
        />
        <button
          onClick={handleAdd}
          className="px-3 py-1 bg-accent hover:bg-accent-strong text-bg font-bold rounded-lg text-[10px] font-mono transition-colors flex items-center justify-center cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Comments List */}
      <div className="space-y-2 max-h-[170px] overflow-y-auto scrollbar-thin pr-1">
        {comments.length === 0 ? (
          <div className="py-6 text-center text-[9.5px] font-mono text-muted italic">
            No comments yet. Be the first to note!
          </div>
        ) : (
          comments.map((comm) => (
            <div
              key={comm.id}
              className="p-3 bg-panel border border-border rounded-xl relative group shadow-sm"
            >
              <button
                onClick={() => handleDelete(comm.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-danger-bg text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="flex justify-between items-center text-[8.5px] font-mono text-muted">
                <span className="font-bold text-accent">{comm.author}</span>
                <span>on {comm.file || comm.target}</span>
              </div>
              <p className="text-[9.5px] text-text leading-normal mt-1 font-mono select-text">
                {comm.comment_text || comm.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
