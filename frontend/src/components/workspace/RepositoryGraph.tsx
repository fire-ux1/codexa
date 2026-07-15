// @ts-nocheck
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useMemo, useEffect } from "react";
import { ReactFlow, MiniMap, Controls, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Network, Search, Cpu, RefreshCw, Layers, FileText, Bot, Loader2 } from "lucide-react";

export interface RepositoryGraphProps {
  architecture?: any;
  graphNodes?: any[];
  graphEdges?: any[];
  selectedNode?: any;
  isArchitectureLoading?: boolean;
  isGraphLoadingReactFlow?: boolean;
  onNodeClick?: (event: any, node: any) => void;
  onExplainFile?: (nodeId: string) => void;
  onOpenFile?: (path: string) => void;
  onGetArchitecture?: () => void;
  getFileColor?: (extension: string) => string;
  error?: string | null;
}

export default function RepositoryGraph({
  architecture = null,
  graphNodes = [],
  graphEdges = [],
  selectedNode = null,
  isArchitectureLoading = false,
  isGraphLoadingReactFlow = false,
  onNodeClick = () => {},
  onExplainFile = () => {},
  onOpenFile = () => {},
  onGetArchitecture = () => {},
  getFileColor = () => "#6366F1",
  error = null,
}: RepositoryGraphProps) {
  const [graphMode, setGraphMode] = useState("dependency"); // dependency | call | folder
  const [layoutMode, setLayoutMode] = useState("hierarchical"); // hierarchical | force
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectorNode, setInspectorNode] = useState(selectedNode);

  // Sync selection shifts
  useEffect(() => {
    if (selectedNode) {
      setInspectorNode(selectedNode);
    }
  }, [selectedNode]);

  const handleNodeClickInternal = (event, node) => {
    setInspectorNode(node);
    onNodeClick(event, node);
  };

  // Filter and style nodes based on query and selection
  const nodes = useMemo(() => {
    return graphNodes.map((node) => {
      let opacity = 1;
      let borderGlow = "";

      const matchesSearch = searchQuery.trim()
        ? node.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.id.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      if (searchQuery.trim() && !matchesSearch) {
        opacity = 0.2;
      }

      const isSelected = inspectorNode && inspectorNode.id === node.id;
      const isConnected =
        inspectorNode &&
        (graphEdges.some((e) => e.source === inspectorNode.id && e.target === node.id) ||
          graphEdges.some((e) => e.target === inspectorNode.id && e.source === node.id));

      if (inspectorNode) {
        if (!isSelected && !isConnected) {
          opacity = 0.25;
        }
        if (isSelected) {
          borderGlow = `0 0 15px ${getFileColor(node.data?.extension || ".py")}`;
        }
      }

      return {
        ...node,
        style: {
          ...node.style,
          opacity,
          boxShadow: borderGlow || node.style?.boxShadow,
        },
      };
    });
  }, [graphNodes, graphEdges, inspectorNode, searchQuery, getFileColor]);

  const edges = useMemo(() => {
    return graphEdges.map((edge) => {
      let stroke = "#4b5563";
      let strokeWidth = 1;
      let opacity = 0.7;
      let animated = false;

      const isConnected = inspectorNode && (edge.source === inspectorNode.id || edge.target === inspectorNode.id);

      if (inspectorNode) {
        if (isConnected) {
          stroke = edge.source === inspectorNode.id ? "#a855f7" : "#3b82f6";
          strokeWidth = 2.5;
          opacity = 1;
          animated = true;
        } else {
          opacity = 0.1;
        }
      } else {
        stroke = "#6366f1";
        strokeWidth = 1.5;
        animated = true;
      }

      return {
        ...edge,
        animated,
        style: {
          ...edge.style,
          stroke,
          strokeWidth,
          opacity,
        },
        markerEnd: {
          ...edge.markerEnd,
          color: stroke,
        },
      };
    });
  }, [graphEdges, inspectorNode]);

  return (
    <div className="space-y-5 animate-fade-in w-full h-[580px] flex flex-col text-left">
      
      {/* Toolbar / Options */}
      <div className="border-b border-border pb-4 flex flex-wrap items-center justify-between gap-4 select-none shrink-0">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold text-white flex items-center gap-2 font-sans">
            <Network className="w-4 h-4 text-indigo-400" />
            <span>Interactive Repository Graph</span>
          </h2>
          <p className="text-[11px] text-muted font-sans">
            Visualize project dependencies and system control structures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Graph Type selectors */}
          <div className="flex bg-[#0c0f16] border border-border p-1 rounded-xl">
            {[
              { id: "dependency", label: "Dependency" },
              { id: "call", label: "Call Graph" },
              { id: "folder", label: "Folder Tree" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setGraphMode(btn.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-sans font-medium transition-all cursor-pointer ${
                  graphMode === btn.id ? "bg-indigo-600/15 text-indigo-400 font-semibold" : "text-muted hover:text-text-strong"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Layout Mode selection */}
          <div className="flex bg-[#0c0f16] border border-border p-1 rounded-xl">
            {[
              { id: "hierarchical", label: "Hierarchical" },
              { id: "force", label: "Force Directed" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setLayoutMode(btn.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-sans font-medium transition-all cursor-pointer ${
                  layoutMode === btn.id ? "bg-indigo-600/15 text-indigo-400 font-semibold" : "text-muted hover:text-text-strong"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              className="pl-7 pr-2.5 py-1 rounded-xl bg-bg border border-border text-[11px] font-sans text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 w-[140px]"
            />
            <Search className="w-3.5 h-3.5 text-gray-600 absolute left-2.5 top-1.5" />
          </div>

          {!architecture && (
            <button
              onClick={onGetArchitecture}
              disabled={isArchitectureLoading}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] font-sans flex items-center gap-1 cursor-pointer transition-colors shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isArchitectureLoading ? 'animate-spin' : ''}`} />
              <span>Load Graph</span>
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="py-16 text-center text-rose-400 space-y-4 max-w-md mx-auto bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 w-full font-sans">
          <Network className="w-12 h-12 mx-auto text-rose-400 opacity-60 animate-pulse" />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider font-mono">Graph Loading Failed</p>
            <p className="text-[11px] text-gray-400 font-mono bg-bg px-3 py-2 rounded-lg border border-border max-h-[80px] overflow-y-auto text-left break-all select-all scrollbar-thin">
              {error}
            </p>
          </div>
          <button
            onClick={onGetArchitecture}
            disabled={isArchitectureLoading}
            className="px-5 py-2 text-xs font-bold bg-[#FF9D4D] text-[#0A0D12] hover:bg-[#FFB073] rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-sans shadow-md"
          >
            {isArchitectureLoading ? "Retrying..." : "Retry Loading Graph"}
          </button>
        </div>
      ) : architecture ? (
        <div className="flex-grow grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 min-h-0">
          
          {/* React Flow Canvas */}
          <div className="rounded-2xl border border-[#1c2230] bg-[#0c0f16]/60 relative overflow-hidden h-[420px] xl:h-full">
            {isGraphLoadingReactFlow && (
              <div className="absolute inset-0 bg-[#090b10]/60 flex items-center justify-center z-10 animate-fade-in">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            )}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClickInternal}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#1c2230" gap={18} size={0.7} variant="dots" />
              <Controls
                style={{
                  background: "rgba(12, 15, 22, 0.95)",
                  border: "1px solid rgba(28, 34, 48, 0.9)",
                  borderRadius: "12px",
                  boxShadow: "none",
                }}
              />
              <MiniMap
                nodeStrokeColor={(n) => getFileColor(n?.data?.extension || ".py")}
                nodeColor={() => "rgba(15, 18, 25, 0.95)"}
                maskColor="rgba(9, 11, 16, 0.7)"
                style={{
                  background: "rgba(12, 15, 22, 0.95)",
                  border: "1px solid rgba(28, 34, 48, 0.9)",
                  borderRadius: "12px",
                }}
              />
            </ReactFlow>
          </div>

          {/* Node Inspector Drawer */}
          <div className="bg-[#0f1219] border border-[#1c2230] rounded-2xl p-4.5 flex flex-col justify-between h-[420px] xl:h-full overflow-y-auto select-none">
            
            {inspectorNode ? (
              <div className="space-y-4">
                <div className="border-b border-[#1c2230]/40 pb-3">
                  <span
                    className="text-[9px] uppercase font-bold px-2 py-0.5 rounded tracking-wider border"
                    style={{
                      backgroundColor: `${getFileColor(inspectorNode.data?.extension || ".py")}10`,
                      color: getFileColor(inspectorNode.data?.extension || ".py"),
                      borderColor: `${getFileColor(inspectorNode.data?.extension || ".py")}30`,
                    }}
                  >
                    {(inspectorNode.data?.extension || "py").toUpperCase()} File
                  </span>
                  <h4 className="text-xs font-bold text-white font-mono truncate mt-2">
                    {inspectorNode.data?.label || inspectorNode.id}
                  </h4>
                  <p className="text-[9px] text-gray-500 font-mono mt-1">
                    Size: {inspectorNode.data?.size ? `${(inspectorNode.data.size / 1024).toFixed(1)} KB` : "N/A"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onExplainFile(inspectorNode.id)}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Bot className="w-3.5 h-3.5" /> Explain File
                  </button>
                  <button
                    onClick={() => onOpenFile(inspectorNode.id)}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-gray-500" /> View Content
                  </button>
                </div>

                {/* Info block */}
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1.5 text-[10px] text-gray-400 font-mono text-left">
                  <span className="font-bold text-indigo-400">Dependencies (Imports):</span>
                  <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                    {graphEdges.filter((e) => e.source === inspectorNode.id).length === 0 ? (
                      <p className="italic text-gray-600 text-[9.5px]">No outbound import dependencies.</p>
                    ) : (
                      graphEdges
                        .filter((e) => e.source === inspectorNode.id)
                        .map((e, idx) => (
                          <div key={idx} className="truncate text-gray-300">
                            â†’ {e.target.split(/[/\\]/).pop()}
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 space-y-1.5 text-[10px] text-gray-400 font-mono text-left">
                  <span className="font-bold text-purple-400">Dependents (Incoming):</span>
                  <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                    {graphEdges.filter((e) => e.target === inspectorNode.id).length === 0 ? (
                      <p className="italic text-gray-600 text-[9.5px]">No incoming connections.</p>
                    ) : (
                      graphEdges
                        .filter((e) => e.target === inspectorNode.id)
                        .map((e, idx) => (
                          <div key={idx} className="truncate text-gray-300">
                            â† {e.source.split(/[/\\]/).pop()}
                          </div>
                        ))
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted space-y-2.5 p-4 font-sans">
                <Cpu className="w-8 h-8 text-muted opacity-60" />
                <p className="text-[11px] font-medium leading-normal">Select any file node inside the graph to inspect structural details.</p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border">
              <button
                onClick={onGetArchitecture}
                className="w-full py-2 bg-bg hover:bg-panel border border-border text-[11px] font-sans text-text hover:text-text-strong transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-xl"
              >
                <Layers className="w-3.5 h-3.5 text-muted" />
                <span>Re-Analyze Architecture Report</span>
              </button>
            </div>
            
          </div>
        </div>
      ) : (
        <div className="py-24 text-center text-muted border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 bg-panel/30 max-w-lg mx-auto w-full px-6 select-none">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Network className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[13px] font-semibold text-text-strong font-sans">Repository Graph Uncompiled</h3>
            <p className="text-[11px] text-muted max-w-xs mx-auto font-sans leading-relaxed">
              Compile the workspace dependency structure to visualize project architecture, file networks, and folder trees.
            </p>
          </div>
          <button
            onClick={onGetArchitecture}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-sans transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            Compile Dependency Graph
          </button>
        </div>
      )}

    </div>
  );
}

