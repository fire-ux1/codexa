import { useState, useCallback } from "react";
import { fetchArchitecture, fetchRepositoryGraph, getErrorMessage, fetchFileContent } from "../services/api";
import { MarkerType, Node, Edge } from "@xyflow/react";

export default function useArchitecture(
  repoPath: string,
  setStatus: (status: any) => void,
  getFileColor: (ext: string) => string
) {
  const [architecture, setArchitecture] = useState<string>("");
  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isArchitectureLoading, setIsArchitectureLoading] = useState<boolean>(false);
  const [isGraphLoadingReactFlow, setIsGraphLoadingReactFlow] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetArchitecture = useCallback(async () => {
    try {
      setError(null);
      setIsArchitectureLoading(true);
      setStatus({
        tone: "loading",
        label: "Architecture Analysis",
        message: "Constructing import dependency graph and text analysis...",
      });

      const report = await fetchArchitecture(repoPath);
      setArchitecture(report.analysis || "");

      setIsGraphLoadingReactFlow(true);
      const graph = await fetchRepositoryGraph(repoPath);

      // Rank-based auto layout (longest path ranking)
      const ranks: Record<string, number> = {};
      const adj: Record<string, string[]> = {};

      graph.nodes.forEach((n: any) => {
        ranks[n.id] = 0;
        adj[n.id] = [];
      });

      graph.edges.forEach((e: any) => {
        if (adj[e.source]) {
          adj[e.source].push(e.target);
        }
      });

      let changed = true;
      for (let iter = 0; iter < 100 && changed; iter++) {
        changed = false;
        graph.edges.forEach((e: any) => {
          const u = e.source;
          const v = e.target;
          if (ranks[u] <= ranks[v]) {
            ranks[u] = ranks[v] + 1;
            changed = true;
          }
        });
      }

      // Group nodes by rank
      const rankGroups: Record<number, any[]> = {};
      graph.nodes.forEach((n: any) => {
        const r = ranks[n.id] || 0;
        if (!rankGroups[r]) rankGroups[r] = [];
        rankGroups[r].push(n);
      });

      const rankKeys = Object.keys(rankGroups).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      const formattedNodes: Node[] = [];

      rankKeys.forEach((rankStr, rankIndex) => {
        const rank = parseInt(rankStr, 10);
        const nodesInRank = rankGroups[rank];
        const x = rankIndex * 280 + 80;

        nodesInRank.forEach((node: any, nodeIndex: number) => {
          const heightOffset = ((nodesInRank.length - 1) * 90) / 2;
          const y = 250 + nodeIndex * 90 - heightOffset;

          formattedNodes.push({
            id: node.id,
            data: { label: node.label, ...node.data },
            position: { x, y },
            style: {
              background: "rgba(11, 15, 26, 0.95)",
              border: `1.5px solid ${getFileColor(node.data.extension)}`,
              borderRadius: "12px",
              color: "#f3f4f6",
              padding: "10px 14px",
              fontSize: "11px",
              fontFamily: "monospace",
              width: 175,
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              transition: "opacity 0.2s, box-shadow 0.2s, border-color 0.2s",
            },
          });
        });
      });

      const formattedEdges: Edge[] = graph.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 1.5, transition: "stroke 0.2s, stroke-width 0.2s, opacity 0.2s" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#6366f1",
          width: 16,
          height: 16,
        },
      }));

      setGraphNodes(formattedNodes);
      setGraphEdges(formattedEdges);

      setStatus({
        tone: "success",
        label: "Architecture Configured",
        message: "Graphed codebase dependencies successfully.",
      });

    } catch (error) {
      console.error(error);
      const errMsg = getErrorMessage(error, "Failed to compile architecture insights.");
      setError(errMsg);
      setStatus({
        tone: "error",
        label: "System Error",
        message: errMsg,
      });
    } finally {
      setIsArchitectureLoading(false);
      setIsGraphLoadingReactFlow(false);
    }
  }, [repoPath, setStatus, getFileColor]);

  const handleNodeClick = useCallback(async (_event: any, node: any) => {
    setSelectedNode(node);
    try {
      setIsPreviewLoading(true);
      const res = await fetchFileContent(node.data.path);
      setPreviewContent(res.content);
    } catch (error) {
      setPreviewContent("Error loading file content: " + getErrorMessage(error, "Access Forbidden"));
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  return {
    architecture,
    setArchitecture,
    graphNodes,
    setGraphNodes,
    graphEdges,
    setGraphEdges,
    selectedNode,
    setSelectedNode,
    isArchitectureLoading,
    isGraphLoadingReactFlow,
    previewContent,
    setPreviewContent,
    isPreviewLoading,
    setIsPreviewLoading,
    handleGetArchitecture,
    handleNodeClick,
    error,
  };
}
