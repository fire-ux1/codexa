// @ts-nocheck
import { useState } from "react";

export default function KnowledgeSearch({
  nodes = [],
  onSearchQuery,
  onResetSearch,
  isLoading,
}) {
  const [queryType, setQueryType] = useState("dependers");
  const [startNode, setStartNode] = useState("");
  const [endNode, setEndNode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startNode) return;
    onSearchQuery({
      queryType,
      node: startNode,
      targetNode: queryType === "path" ? endNode : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-3 bg-white/3 border border-white/5 rounded-xl text-left select-none">
      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-500">
        Semantic Relationship Finder
      </span>

      {/* Query type selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setQueryType("dependers")}
          className={`flex-1 py-1 text-[9px] font-mono font-bold rounded uppercase border transition-all ${
            queryType === "dependers"
              ? "bg-violet-600/10 border-violet-500/30 text-violet-400"
              : "bg-white/3 border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          Find Dependents
        </button>
        <button
          type="button"
          onClick={() => setQueryType("path")}
          className={`flex-1 py-1 text-[9px] font-mono font-bold rounded uppercase border transition-all ${
            queryType === "path"
              ? "bg-violet-600/10 border-violet-500/30 text-violet-400"
              : "bg-white/3 border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          Trace Flow Path
        </button>
      </div>

      {/* Input controls */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-mono font-bold uppercase tracking-wider text-gray-500">
            {queryType === "path" ? "Start Node" : "Target Symbol Name"}
          </label>
          <input
            type="text"
            list="nodes-datalist"
            value={startNode}
            onChange={(e) => setStartNode(e.target.value)}
            placeholder="e.g. AuthService, scan_repository"
            className="bg-[#090c14] border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-300 font-mono outline-none focus:border-violet-500/40"
          />
        </div>

        {queryType === "path" && (
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-mono font-bold uppercase tracking-wider text-gray-500">
              End Node
            </label>
            <input
              type="text"
              list="nodes-datalist"
              value={endNode}
              onChange={(e) => setEndNode(e.target.value)}
              placeholder="e.g. SQLite database, api_router"
              className="bg-[#090c14] border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-300 font-mono outline-none focus:border-violet-500/40"
            />
          </div>
        )}
      </div>

      {/* Datalist helper */}
      <datalist id="nodes-datalist">
        {nodes.map((n) => (
          <option key={n.id} value={n.data?.name || n.id} />
        ))}
      </datalist>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading || !startNode}
          className="flex-1 px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-500 transition-all disabled:opacity-40"
        >
          {isLoading ? "Querying..." : "Analyze Graph"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStartNode("");
            setEndNode("");
            onResetSearch && onResetSearch();
          }}
          className="px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg bg-white/5 border border-white/8 text-gray-400 hover:text-white transition-all"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

