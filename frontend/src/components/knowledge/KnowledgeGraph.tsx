// @ts-nocheck
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Stable shared references so omitted props don't create a new
// Set/array identity on every render (which would defeat useMemo below).
const EMPTY_ARRAY = [];
const EMPTY_SET = new Set();

export default function KnowledgeGraph({
  nodes = EMPTY_ARRAY,
  edges = EMPTY_ARRAY,
  onNodeClick,
  highlightedNodeIds = EMPTY_SET,
  highlightedEdgeIds = EMPTY_SET,
}) {
  const [nodeSearch, setNodeSearch] = useState("");

  // Local, draggable copy of nodes/edges. React Flow expects the owner of
  // controlled nodes/edges to apply changes (drag, selection, etc.) back
  // via onNodesChange/onEdgesChange, or position updates get discarded on
  // the next re-render.
  const [rawNodes, setRawNodes] = useState(nodes);
  const [rawEdges, setRawEdges] = useState(edges);

  // Keep local state in sync if the parent passes a genuinely new
  // nodes/edges array (e.g. loading a different graph).
  useEffect(() => {
    setRawNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    setRawEdges(edges);
  }, [edges]);

  const handleNodesChange = useCallback(
    (changes) => setRawNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const handleEdgesChange = useCallback(
    (changes) => setRawEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Map nodes to React Flow format, applying highlighting styles
  const formattedNodes = useMemo(() => {
    return rawNodes.map((n) => {
      const name = n.data?.name ?? "";
      const isSearched = nodeSearch && name.toLowerCase().includes(nodeSearch.toLowerCase());
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
  }, [rawNodes, nodeSearch, highlightedNodeIds]);

  // Format edges applying dimming / highlighting colors
  const formattedEdges = useMemo(() => {
    return rawEdges.map((e) => {
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
  }, [rawEdges, highlightedEdgeIds]);

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
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
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