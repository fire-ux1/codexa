// @ts-nocheck
import { useState, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export default function KnowledgeGraph({
  nodes = [],
  edges = [],
  onNodeClick,
  highlightedNodeIds = new Set(),
  highlightedEdgeIds = new Set(),
}) {
  const [nodeSearch, setNodeSearch] = useState("");

  // Map nodes to React Flow format, applying highlighting styles
  const formattedNodes = useMemo(() => {
    return nodes.map((n) => {
      const isSearched = nodeSearch && n.data.name.toLowerCase().includes(nodeSearch.toLowerCase());
      const isHighlighted = highlightedNodeIds.size > 0 && highlightedNodeIds.has(n.id);
      const isDimmed = highlightedNodeIds.size > 0 && !isHighlighted;

      let opacity = "opacity-100";
      let border = "border-white/10";
      let scale = "scale-100";

      if (isSearched) {
        border = "border-yellow-400 border-2 shadow-[0_0_12px_rgba(234,179,8,0.4)]";
        scale = "scale-105";
      } else if (isHighlighted) {
        border = "border-violet-500 border-2 shadow-[0_0_12px_rgba(139,92,246,0.3)]";
        scale = "scale-105";
      } else if (isDimmed) {
        opacity = "opacity-25";
      }

      return {
        ...n,
        // Override standard node styles inline for React Flow nodes
        style: {
          ...n.style,
          transition: "all 0.25s ease-in-out",
        },
        className: `${opacity} ${border} ${scale} cursor-pointer hover:shadow-lg transition-all`,
      };
    });
  }, [nodes, nodeSearch, highlightedNodeIds]);

  // Format edges applying dimming / highlighting colors
  const formattedEdges = useMemo(() => {
    return edges.map((e) => {
      const isHighlighted = highlightedEdgeIds.size > 0 && highlightedEdgeIds.has(e.id);
      const isDimmed = highlightedEdgeIds.size > 0 && !isHighlighted;

      return {
        ...e,
        animated: isHighlighted || e.animated,
        style: {
          ...e.style,
          strokeWidth: isHighlighted ? 3 : 1,
          opacity: isDimmed ? 0.15 : 1,
          transition: "opacity 0.2s ease",
        },
      };
    });
  }, [edges, highlightedEdgeIds]);

  return (
    <div className="w-full h-full relative flex flex-col min-h-0 bg-[#06080d]">
      
      {/* Mini floating header for local search */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <input
          type="text"
          value={nodeSearch}
          onChange={(e) => setNodeSearch(e.target.value)}
          placeholder="Filter nodes in view..."
          className="bg-[#090c14] border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-300 font-mono placeholder-gray-600 outline-none focus:border-violet-500/40 focus:bg-violet-500/5 transition-all select-none w-48 shadow-lg"
        />
        {nodeSearch && (
          <button
            onClick={() => setNodeSearch("")}
            className="text-[9px] font-mono px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* React Flow Viewport */}
      <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={formattedNodes}
          edges={formattedEdges}
          onNodeClick={(_, node) => onNodeClick && onNodeClick(node)}
          fitView
          colorMode="dark"
        >
          <Background color="#1e293b" gap={16} size={1} />
          <Controls className="bg-[#090c14] border border-white/5 text-white" />
          <MiniMap
            nodeColor={(n) => n.style?.background || "#1e293b"}
            maskColor="rgba(0, 0, 0, 0.6)"
            className="bg-[#090c14] border border-white/5 rounded-lg overflow-hidden shadow-2xl"
          />
        </ReactFlow>
      </div>

    </div>
  );
}

