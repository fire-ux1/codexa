/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { fetchComments, addComment, deleteComment } from "../../services/collaboration";

export default function CommentsPanel({ projectId, activeFile }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [lineNum, setLineNum] = useState(1);

  const loadComments = useCallback(async () => {
    if (!projectId || !activeFile) return;
    try {
      const res = await fetchComments(projectId, activeFile);
      setComments(res || []);
    } catch (err) {
      console.error("[CommentsPanel] Load error:", err);
    }
  }, [projectId, activeFile]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !projectId || !activeFile) return;
    try {
      await addComment(projectId, activeFile, lineNum, commentText.trim());
      setCommentText("");
      loadComments();
    } catch (err) {
      console.error("[CommentsPanel] Add error:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      loadComments();
    } catch (err) {
      console.error("[CommentsPanel] Delete error:", err);
    }
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-[10px] font-mono select-none">
        Select a team project to enable collaboration discussions.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#07090f] text-gray-300">
      
      {/* Title */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-white/5 bg-[#090c14] shrink-0 select-none">
        <span className="text-[9px] font-bold text-gray-500 font-mono uppercase tracking-widest">
          File Comments Discussion
        </span>
        <button
          onClick={loadComments}
          className="text-gray-500 hover:text-gray-300 text-[8px] font-mono"
        >
          Reload
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {comments.length === 0 ? (
          <p className="text-[10px] text-gray-600 italic font-mono text-center select-none pt-4">
            No comments in this file yet. Start the discussion below.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="p-2.5 bg-white/2 border border-white/5 rounded-lg text-left flex flex-col gap-1 select-text">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold font-mono text-gray-300">{c.author}</span>
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="text-rose-500 hover:text-rose-400 text-[8px] font-mono"
                >
                  Delete
                </button>
              </div>
              <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{c.comment_text}</p>
              <div className="flex justify-between items-center text-[7px] text-gray-600 font-mono select-none">
                <span>Line {c.line}</span>
                <span>{new Date(c.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Write input form */}
      <form onSubmit={handleAddComment} className="p-3 bg-[#080b12] border-t border-white/5 shrink-0 select-none space-y-2">
        <div className="flex gap-2 items-center">
          <div className="flex flex-col gap-0.5 w-16">
            <label className="text-[7px] font-mono font-bold text-gray-500 uppercase">Line</label>
            <input
              type="number"
              min="1"
              value={lineNum}
              onChange={(e) => setLineNum(parseInt(e.target.value) || 1)}
              className="bg-[#090c14] border border-white/8 rounded px-1.5 py-0.5 text-[10px] text-gray-300 font-mono text-center outline-none"
            />
          </div>
          <div className="flex-1 flex flex-col gap-0.5">
            <label className="text-[7px] font-mono font-bold text-gray-500 uppercase">Message</label>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type inline feedback..."
              className="bg-[#090c14] border border-white/8 rounded px-2 py-0.5 text-[10px] text-gray-300 font-mono outline-none focus:border-violet-500/40"
            />
          </div>
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="px-2.5 py-1.5 text-[9px] font-mono font-bold rounded bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-500 transition-all disabled:opacity-40 self-end"
          >
            Post
          </button>
        </div>
      </form>

    </div>
  );
}
