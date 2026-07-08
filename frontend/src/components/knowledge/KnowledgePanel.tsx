// @ts-nocheck
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import { fetchKnowledgeGraph, queryKnowledgeGraph, fetchCriticalMetrics } from "../../services/knowledge";
import KnowledgeGraph from "./KnowledgeGraph";
import KnowledgeSearch from "./KnowledgeSearch";

export default function KnowledgePanel({ repoId }) {
  const [loading, setLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);

  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [criticalData, setCriticalData] = useState(null);

  // Highlighting selectors
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState(new Set());

  // Search Results details
  const [searchResults, setSearchResults] = useState(null);

  const loadGraphAndMetrics = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    setSearchResults(null);
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
    try {
      const gData = await fetchKnowledgeGraph(repoId);
      setGraphData(gData);

      const cData = await fetchCriticalMetrics(repoId);
      setCriticalData(cData);
    } catch (err) {
      console.error("[KnowledgePanel] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    loadGraphAndMetrics();
  }, [repoId, loadGraphAndMetrics]);

  // Execute Graph Relationship query
  const handleGraphQuery = async ({ queryType, node, targetNode }) => {
    setQueryLoading(true);
    setSearchResults(null);
    try {
      const res = await queryKnowledgeGraph(repoId, queryType, node, targetNode);
      if (res.status === "success") {
        setSearchResults({ type: queryType, data: res });

        // Highlight matching elements in viewport
        const nodeIds = new Set();
        const edgeIds = new Set();

        if (queryType === "dependers") {
          if (res.target_node) nodeIds.add(res.target_node.id);
          (res.dependers || []).forEach((dep) => {
            nodeIds.add(dep.id);
            // Highlight edges connecting them
            graphData.edges.forEach((edge) => {
              if (
                (edge.source === dep.id && edge.target === res.target_node.id) ||
                (edge.target === dep.id && edge.source === res.target_node.id)
              ) {
                edgeIds.add(edge.id);
              }
            });
          });
        } else if (queryType === "path") {
          const pathNodes = res.path || [];
          for (let i = 0; i < pathNodes.length; i++) {
            nodeIds.add(pathNodes[i].id);
            if (i < pathNodes.length - 1) {
              const currentId = pathNodes[i].id;
              const nextId = pathNodes[i + 1].id;
              graphData.edges.forEach((edge) => {
                if (
                  (edge.source === currentId && edge.target === nextId) ||
                  (edge.source === nextId && edge.target === currentId)
                ) {
                  edgeIds.add(edge.id);
                }
              });
            }
          }
        }

        setHighlightedNodes(nodeIds);
        setHighlightedEdges(edgeIds);
      } else {
        setSearchResults({ type: "error", message: res.message || "Query failed." });
      }
    } catch (err) {
      console.error("[KnowledgePanel] Query error:", err);
      setSearchResults({ type: "error", message: "Failed to run query search." });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleResetSearch = () => {
    setSearchResults(null);
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
  };

  const handleSelectNodeFromGraph = (node) => {
    // Triggers a dependent query automatically on graph node doubleclick / click
    const name = node.data?.name || node.id;
    handleGraphQuery({ queryType: "dependers", node: name, targetNode: null });
  };

  if (!repoId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono select-none">
        Open or Index a repository to build the semantic knowledge graph.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex min-h-0 overflow-hidden bg-[#07090f] text-gray-300">
      
      {/* Left side panel tools */}
      <div className="w-[300px] border-r border-white/5 flex flex-col shrink-0 min-h-0 overflow-hidden p-3 space-y-4">
        
        {/* Graph search box */}
        <KnowledgeSearch
          nodes={graphData.nodes}
          onSearchQuery={handleGraphQuery}
          onResetSearch={handleResetSearch}
          isLoading={queryLoading}
        />

        {/* Semantic Query outcome / details */}
        {searchResults && (
          <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex flex-col gap-2 shrink-0 max-h-[220px] overflow-y-auto scrollbar-thin">
            <span className="text-[9px] font-mono font-bold text-violet-400 uppercase tracking-widest">
              Query Outcome
            </span>
            {searchResults.type === "error" ? (
              <p className="text-[10px] text-rose-400 font-mono leading-relaxed">{searchResults.message}</p>
            ) : searchResults.type === "dependers" ? (
              <div className="space-y-1.5 font-mono text-[10px]">
                <p className="text-gray-400 font-bold">
                  Dependents of {searchResults.data.target_node?.name}:
                </p>
                {searchResults.data.dependers?.length === 0 ? (
                  <p className="text-gray-600 italic">No dependents found.</p>
                ) : (
                  searchResults.data.dependers.map((dep, i) => (
                    <div key={i} className="text-gray-300 leading-none">
                      â€¢ <span className="text-gray-500">[{dep.type}]</span> {dep.name}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[10px]">
                <p className="text-gray-400 font-bold">Shortest Dependency Path:</p>
                {searchResults.data.path?.map((p, i) => (
                  <div key={i} className="text-gray-300 leading-none">
                    {i > 0 && <span className="text-gray-600 pl-2">â†“</span>}
                    <div className="pl-4">
                      <span className="text-gray-500">[{p.type}]</span> {p.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hotspots / Cycle alerts */}
        {criticalData && (
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4">
            
            {/* Cycle alerts */}
            <div className="space-y-1.5 select-none">
              <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider">
                Circular Dependencies ({criticalData.cycles?.total_cycles || 0})
              </span>
              <div className="space-y-1 max-h-[140px] overflow-y-auto scrollbar-thin">
                {(criticalData.cycles?.cycles || []).map((cycle, i) => (
                  <div key={i} className="p-2 bg-rose-950/10 border border-rose-500/10 rounded text-[9px] font-mono text-rose-300 leading-relaxed">
                    ðŸ” Cycle: {cycle.join(" â†’ ")}
                  </div>
                ))}
                {criticalData.cycles?.total_cycles === 0 && (
                  <p className="text-[10px] text-emerald-400 font-mono">âœ“ No recursion circular dependencies.</p>
                )}
              </div>
            </div>

            {/* In Degree hotspots */}
            <div className="space-y-1.5 select-none">
              <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider">
                Critical Coupling Hotspots
              </span>
              <div className="space-y-1">
                {(criticalData.critical?.critical_incoming || []).slice(0, 5).map((node, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-mono bg-white/2 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-white/5 transition-all">
                    <span className="truncate max-w-[180px]" title={node.name}>
                      {node.name}
                    </span>
                    <span className="text-[8px] text-violet-400 font-bold bg-violet-600/10 px-1 py-0.5 rounded">
                      In-degree: {node.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* React Flow viewport pane */}
      <div className="flex-1 min-w-0 h-full relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2.5 select-none bg-[#06080d]">
            <span className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shrink-0" />
            <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase animate-pulse">
              Plotting Repository Knowledge Graph...
            </span>
          </div>
        ) : (
          <KnowledgeGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            onNodeClick={handleSelectNodeFromGraph}
            highlightedNodeIds={highlightedNodes}
            highlightedEdgeIds={highlightedEdges}
          />
        )}
      </div>

    </div>
  );
}

