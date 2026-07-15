import React, { useState, useMemo } from "react";
import { ReactFlow, MiniMap, Controls, Background, Node, Edge, BackgroundVariant } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { IconCpu, IconSearch } from "../components/icons/Icons";
import FormatText from "../components/common/FormatText";

interface ArchitectureTabProps {
  architecture: string | null | undefined;
  graphNodes: Node[];
  graphEdges: Edge[];
  selectedNode: Node | null;
  isArchitectureLoading: boolean;
  isGraphLoadingReactFlow: boolean;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onExplainFile: () => void;
  onOpenFile: (id: string) => void;
  onGetArchitecture: () => void;
  getFileColor: (ext: string) => string;
}

export default function ArchitectureTab({
  architecture,
  graphNodes,
  graphEdges,
  selectedNode,
  isArchitectureLoading,
  isGraphLoadingReactFlow,
  onNodeClick,
  onExplainFile,
  onOpenFile,
  onGetArchitecture,
  getFileColor,
}: ArchitectureTabProps) {
  const [showReport, setShowReport] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleNodeClickInternal = (event: React.MouseEvent, node: Node) => {
    setShowReport(false);
    onNodeClick(event, node);
  };

  // Filter and style nodes based on search and selectedNode connections
  const nodes = useMemo(() => {
    return graphNodes.map((node) => {
      let opacity = 1;
      let borderGlow = "";

      const label = node.data?.label as string || "";
      const matchesSearch = searchQuery.trim()
        ? label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.id.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      if (searchQuery.trim() && !matchesSearch) {
        opacity = 0.2;
      }

      const isSelected = selectedNode && selectedNode.id === node.id;
      const isConnected =
        selectedNode &&
        (graphEdges.some((e) => e.source === selectedNode.id && e.target === node.id) ||
          graphEdges.some((e) => e.target === selectedNode.id && e.source === node.id));

      if (selectedNode) {
        if (!isSelected && !isConnected) {
          opacity = 0.25;
        }
        if (isSelected) {
          const extension = node.data?.extension as string || ".py";
          borderGlow = `0 0 15px ${getFileColor(extension)}`;
        }
      }

      return {
        ...node,
        style: {
          ...node.style,
          opacity,
          boxShadow: borderGlow || (node.style ? (node.style.boxShadow as string) : undefined),
        },
      };
    });
  }, [graphNodes, graphEdges, selectedNode, searchQuery, getFileColor]);

  // Style and animate edges based on connection to selection
  const edges = useMemo(() => {
    return graphEdges.map((edge) => {
      let stroke = "#4b5563";
      let strokeWidth = 1;
      let opacity: number;
      let animated: boolean;

      const isConnected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

      if (selectedNode) {
        if (isConnected) {
          stroke = edge.source === selectedNode.id ? "#FF9D4D" : "#7FE3E8"; // amber for outgoing, cyan for incoming
          strokeWidth = 2.5;
          opacity = 1;
          animated = true;
        } else {
          opacity = 0.1;
          animated = false;
        }
      } else {
        stroke = "#B69CFF";
        strokeWidth = 1.5;
        opacity = 0.7;
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
        markerEnd: typeof edge.markerEnd === 'object' && edge.markerEnd !== null ? {
          ...edge.markerEnd,
          color: stroke,
        } : { color: stroke } as any,
      };
    });
  }, [graphEdges, selectedNode]);

  return (
    <div className="space-y-6 animate-fade-in w-full h-[580px] flex flex-col">
      {/* Header */}
      <div className="border-b border-border pb-4 shrink-0 flex flex-wrap items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xs font-semibold text-text-strong flex items-center gap-2 font-sans">
            <IconCpu className="w-4 h-4 text-accent" /> Interactive Dependency Graph
          </h2>
          <p className="mt-1 text-[11px] text-muted leading-relaxed font-sans">
            Inspect import dependency chains. Nodes positioned left-to-right (dependencies to dependents).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Node Search Bar */}
          {architecture && (
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted">
                <IconSearch className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className="pl-8 pr-3 py-1.5 rounded-lg text-[11px] bg-bg border border-border text-text-strong placeholder-muted focus:outline-none focus:border-accent w-[160px] transition-all font-sans shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted hover:text-text-strong text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {!architecture && (
            <button
              onClick={onGetArchitecture}
              disabled={isArchitectureLoading}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] font-sans flex items-center gap-1 cursor-pointer transition-colors shadow-md"
            >
              <span>{isArchitectureLoading ? "Tracing Architecture..." : "Load Graph"}</span>
            </button>
          )}
        </div>
      </div>

      {architecture ? (
        <div className="flex-grow grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 min-h-0">
          {/* React Flow Panel */}
          <div className="h-[430px] xl:h-full rounded-2xl border border-border bg-panel relative overflow-hidden shadow-lg">
            {isGraphLoadingReactFlow ? (
              <div className="absolute inset-0 flex items-center justify-center bg-bg/60 z-10">
                <span className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></span>
              </div>
            ) : null}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClickInternal}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#222834" gap={20} size={0.6} variant={BackgroundVariant.Dots} />
              <Controls
                style={{
                  background: "rgba(16, 20, 27, 0.95)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                }}
              />
              <MiniMap
                nodeStrokeColor={(n: any) => getFileColor(n?.data?.extension || ".py")}
                nodeColor={() => "rgba(10, 13, 18, 0.95)"}
                maskColor="rgba(10, 13, 18, 0.75)"
                style={{
                  background: "rgba(16, 20, 27, 0.95)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                }}
              />
            </ReactFlow>
          </div>

          {/* File Details Drawer */}
          <div className="p-4 rounded-2xl border border-border bg-panel flex flex-col justify-between h-[430px] xl:h-full overflow-y-auto shadow-lg select-none">
            {showReport ? (
              <div className="space-y-4 flex-grow">
                <div className="pb-3 border-b border-border">
                  <h4 className="text-xs font-semibold text-text-strong font-sans">
                    Senior Architect Report
                  </h4>
                </div>
                <div className="text-[11px] text-text font-sans max-h-[290px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                  <FormatText text={architecture} />
                </div>
              </div>
            ) : selectedNode ? (
              <div className="space-y-4 font-sans text-left">
                <div className="pb-3 border-b border-border">
                  <span
                    className="text-[9px] uppercase font-bold px-2 py-0.5 rounded tracking-wider font-mono"
                    style={{
                      backgroundColor: `${getFileColor(selectedNode.data?.extension as string || ".py")}20`,
                      color: getFileColor(selectedNode.data?.extension as string || ".py"),
                      border: `1px solid ${getFileColor(selectedNode.data?.extension as string || ".py")}40`
                    }}
                  >
                    {(selectedNode.data?.extension as string || "py").toUpperCase().replace(".", "")} File
                  </span>
                  <h4 className="text-xs font-bold text-text-strong font-mono truncate mt-2">
                    {selectedNode.data?.label as string}
                  </h4>
                  <p className="text-[10px] text-muted font-mono truncate mt-1">
                    Size: {((selectedNode.data?.size as number || 0) / 1024).toFixed(2)} KB
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onExplainFile}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[11px] text-white font-bold transition-all cursor-pointer font-sans"
                  >
                    Explain File
                  </button>
                  <button
                    onClick={() => onOpenFile(selectedNode.id)}
                    className="flex-1 py-1.5 bg-bg hover:bg-panel-alt-2 border border-border rounded-lg text-[11px] text-text font-medium transition-all cursor-pointer font-sans"
                  >
                    View Content
                  </button>
                </div>

                <div className="p-3 bg-bg rounded-xl border border-border space-y-1.5 text-[11px] text-text">
                  <p className="font-semibold text-secondary font-sans">Import Dependencies:</p>
                  <div className="space-y-1 font-mono max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                    {graphEdges.filter(e => e.source === selectedNode.id).length === 0 ? (
                      <p className="italic text-muted text-[10px]">No outgoing imports.</p>
                    ) : (
                      graphEdges.filter(e => e.source === selectedNode.id).map(e => (
                        <p key={e.id} className="truncate text-text text-[10px]">→ {e.target?.split("/").pop()}</p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-2 font-sans">
                <IconCpu className="w-8 h-8 text-muted opacity-60" />
                <p className="text-[11px] text-muted">
                  Select a file node in the graph to inspect details, or read the architect report.
                </p>
              </div>
            )}

            {/* Architect Text report */}
            <div className="mt-4 pt-3 border-t border-border shrink-0">
              <button
                onClick={() => setShowReport(!showReport)}
                className="w-full py-2 bg-bg hover:bg-panel border border-border rounded-xl text-[11px] font-semibold text-text hover:text-text-strong transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
              >
                <IconCpu className="w-3.5 h-3.5" />
                {showReport ? "Show File Details" : "Read Architect Text Report"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center text-muted border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 bg-panel/30 max-w-lg mx-auto w-full px-6 select-none font-sans">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <IconCpu className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[13px] font-semibold text-text-strong">Architecture Graph Uncompiled</h3>
            <p className="text-[11px] text-muted max-w-xs mx-auto leading-relaxed">
              Compile the workspace modules structure to map import dependency chains and view architecture charts.
            </p>
          </div>
          <button
            onClick={onGetArchitecture}
            disabled={isArchitectureLoading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            {isArchitectureLoading ? "Tracing Architecture..." : "Generate Architecture Visuals"}
          </button>
        </div>
      )}
    </div>
  );
}
