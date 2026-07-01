/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { fetchProjectActivity } from "../../services/collaboration";

export default function ActivityFeed({ projectId }) {
  const [feed, setFeed] = useState([]);

  const loadFeed = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetchProjectActivity(projectId);
      setFeed(res || []);
    } catch (err) {
      console.error("[ActivityFeed] Load error:", err);
    }
  }, [projectId]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  if (!projectId) return null;

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#07090f] text-gray-300">
      
      {/* Title */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-white/5 bg-[#090c14] shrink-0 select-none">
        <span className="text-[9px] font-bold text-gray-500 font-mono uppercase tracking-widest">
          Project Activity Feed
        </span>
        <button
          onClick={loadFeed}
          className="text-gray-500 hover:text-gray-300 text-[8px] font-mono"
        >
          Reload
        </button>
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {feed.length === 0 ? (
          <p className="text-[10px] text-gray-600 italic font-mono text-center select-none pt-4">
            No recent project activities.
          </p>
        ) : (
          feed.map((item, idx) => {
            const formattedDate = new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={idx} className="p-2.5 bg-white/2 border border-white/5 rounded-lg text-left flex flex-col gap-1 select-text">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono text-gray-300">
                    {item.author} commented
                  </span>
                  <span className="text-[8px] text-gray-600 font-mono select-none">
                    {formattedDate}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono italic">
                  "{item.message}"
                </p>
                <span className="text-[8px] text-gray-500 font-mono select-none truncate">
                  File: {item.path}
                </span>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
