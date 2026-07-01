import { useState } from "react";
import { ReactFlow, MiniMap, Controls, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { IconCpu } from "../components/icons/Icons";
import FormatText from "../components/common/FormatText";

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
}) {
  const [showReport, setShowReport] = useState(false);

  const handleNodeClickInternal = (event, node) => {
    setShowReport(false);
    onNodeClick(event, node);
  };
  return (
    <div className="space-y-6 animate-fade-in w-full h-[580px] flex flex-col">
      <div className="border-b border-white/5 pb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <IconCpu className="w-5 h-5 text-indigo-400" /> Interactive Dependency Graph
          </h2>
          <p className="mt-1 text-xs text-soft leading-relaxed">
            Drag, zoom, and click nodes to open code explanations and preview full file contents.
          </p>
        </div>

        {!architecture && (
          <button
            onClick={onGetArchitecture}
            disabled={isArchitectureLoading}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all inline-flex items-center gap-1.5"
          >
            {isArchitectureLoading ? "Loading..." : "Load Graph"}
          </button>
        )}
      </div>

      {architecture ? (
        <div className="flex-grow grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 min-h-0">

          {/* React Flow Panel */}
          <div className="h-[430px] xl:h-full rounded-2xl border border-white/10 bg-black/35 relative overflow-hidden">
            {isGraphLoadingReactFlow ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <span className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
              </div>
            ) : null}

            <ReactFlow
              nodes={graphNodes}
              edges={graphEdges}
              onNodeClick={handleNodeClickInternal}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#1f2937" gap={20} size={0.6} variant="dots" />
              <Controls
                style={{
                  background: "rgba(11, 15, 25, 0.9)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                }}
              />
              <MiniMap
                nodeStrokeColor={(n) => getFileColor(n?.data?.extension || ".py")}
                nodeColor={() => "rgba(17, 24, 39, 0.95)"}
                maskColor="rgba(3, 7, 18, 0.75)"
                style={{
                  background: "rgba(11, 15, 25, 0.9)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                }}
              />
            </ReactFlow>
          </div>

          {/* File Details Drawer */}
          <div className="p-4 rounded-2xl border border-white/5 bg-black/25 flex flex-col justify-between h-full xl:h-[430px] overflow-y-auto">
            {showReport ? (
              <div className="space-y-4 flex-grow">
                <div className="pb-3 border-b border-white/5">
                  <h4 className="text-sm font-bold text-white font-mono">
                    Senior Architect Report
                  </h4>
                </div>
                <div className="text-xs text-gray-300 font-sans max-h-[290px] overflow-y-auto pr-1 space-y-2">
                  <FormatText text={architecture} />
                </div>
              </div>
            ) : selectedNode ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-white/5">
                  <span
                    className="text-[9px] uppercase font-bold px-2 py-0.5 rounded tracking-wider"
                    style={{
                      backgroundColor: `${getFileColor(selectedNode.data.extension)}20`,
                      color: getFileColor(selectedNode.data.extension),
                      border: `1px solid ${getFileColor(selectedNode.data.extension)}40`
                    }}
                  >
                    {selectedNode.data.extension.toUpperCase()} File
                  </span>
                  <h4 className="text-sm font-bold text-white font-mono truncate mt-2">
                    {selectedNode.data.label}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono truncate mt-1">
                    Size: {(selectedNode.data.size / 1024).toFixed(2)} KB
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onExplainFile}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] text-white font-bold transition-all"
                  >
                    Explain File
                  </button>
                  <button
                    onClick={() => onOpenFile(selectedNode.id)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] text-gray-300 font-medium transition-all"
                  >
                    View Content
                  </button>
                </div>

                <div className="p-3 bg-white/2.5 rounded-xl border border-white/5 space-y-1.5 text-[11px] text-gray-400">
                  <p className="font-semibold text-indigo-400">Import Dependencies:</p>
                  <div className="space-y-1 font-mono max-h-[140px] overflow-y-auto pr-1">
                    {graphEdges.filter(e => e.source === selectedNode.id).length === 0 ? (
                      <p className="italic text-gray-600">No outgoing imports.</p>
                    ) : (
                      graphEdges.filter(e => e.source === selectedNode.id).map(e => (
                        <p key={e.id} className="truncate text-gray-300">→ {e.target.split("/").pop()}</p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-4">
                <p className="text-xs text-gray-600 italic">Select a node in the graph to inspect details, or read the architect report.</p>
              </div>
            )}

            {/* Architect Text report */}
            <div className="mt-4 pt-3 border-t border-white/5 shrink-0">
              <button
                onClick={() => setShowReport(!showReport)}
                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-semibold text-gray-300 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1"
              >
                <IconCpu className="w-3.5 h-3.5" />
                {showReport ? "Show File Details" : "Read Architect Text Report"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 text-center text-gray-500 space-y-4 w-full">
          <IconCpu className="w-12 h-12 mx-auto text-gray-600 opacity-60" />
          <p className="text-sm">Architecture graph not compiled yet.</p>
          <button
            onClick={onGetArchitecture}
            disabled={isArchitectureLoading}
            className="px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-50 text-white rounded-lg transition-all"
          >
            Generate Architecture Visuals
          </button>
        </div>
      )}
    </div>
  );
}
