import { useState, useCallback } from "react";
import { fetchCallGraph, getErrorMessage } from "../services/api";

export default function useCallGraph(
  repoPath: string,
  setStatus: (status: any) => void
) {
  const [callGraph, setCallGraph] = useState<any>(null);
  const [isGraphLoading, setIsGraphLoading] = useState<boolean>(false);
  const [graphSearch, setGraphSearch] = useState<string>("");
  const [selectedFunc, setSelectedFunc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetCallGraph = useCallback(async () => {
    try {
      setError(null);
      setIsGraphLoading(true);
      setStatus({
        tone: "loading",
        label: "Call Graph",
        message: "Analyzing function mappings and dependencies...",
      });

      const response = await fetchCallGraph(repoPath);
      setCallGraph(response);

      const keys = Object.keys(response);
      if (keys.length > 0) {
        setSelectedFunc(keys[0]);
      }

      setStatus({
        tone: "success",
        label: "Call Graph Ready",
        message: `Mapped call relations across ${keys.length} defined symbols.`,
      });
    } catch (error) {
      console.error(error);
      const errMsg = getErrorMessage(error, "Failed to compile call graph mappings.");
      setError(errMsg);
      setStatus({
        tone: "error",
        label: "System Error",
        message: errMsg,
      });
    } finally {
      setIsGraphLoading(false);
    }
  }, [repoPath, setStatus]);

  return {
    callGraph,
    setCallGraph,
    isGraphLoading,
    graphSearch,
    setGraphSearch,
    selectedFunc,
    setSelectedFunc,
    handleGetCallGraph,
    error,
  };
}
