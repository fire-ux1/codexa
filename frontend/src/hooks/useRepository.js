import { useState, useCallback } from "react";
import { cloneRepository, deleteRepository, fetchRepositories, getErrorMessage, API_BASE_URL } from "../services/api";

export default function useRepository(token, showToast, history, setHistory) {
  const [repoUrl, setRepoUrl] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(null);
  const [metrics, setMetrics] = useState({ filesIndexed: 0, chunksIndexed: 0 });
  const [status, setStatus] = useState({
    tone: "idle",
    label: "Workspace Status",
    message: "Welcome to CodePilot. Choose a repository or index a new one.",
  });

  const clearWorkspace = useCallback(() => {
    setRepoPath("");
    setMetrics({ filesIndexed: 0, chunksIndexed: 0 });
    setIndexingProgress(null);
    setStatus({
      tone: "idle",
      label: "Workspace Status",
      message: "Ready to index a new repository.",
    });
  }, []);

  const selectRepositoryFromHistory = useCallback((repo) => {
    setRepoPath(repo.repository_path);
    setMetrics({
      filesIndexed: repo.files_indexed,
      chunksIndexed: repo.chunks_indexed,
    });
    setIndexingProgress(null);
    setStatus({
      tone: "success",
      label: "Ready",
      message: `Loaded repository index: ${repo.repository_name}`,
    });
  }, []);

  const handleDeleteRepository = useCallback(async (e, repoId) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this repository index? This deletes the SQLite record, ChromaDB collection, and cloned folder.")) {
      return;
    }
    try {
      await deleteRepository(repoId);
      showToast("Repository index deleted.", "success");
      const list = await fetchRepositories();
      setHistory(list);

      if (repoPath) {
        const deleted = history.find((r) => r.id === repoId);
        if (deleted && deleted.repository_path === repoPath) {
          clearWorkspace();
        }
      }
    } catch {
      showToast("Deletion failed.", "error");
    }
  }, [repoPath, history, setHistory, showToast, clearWorkspace]);

  const handleIndexRepository = useCallback(async () => {
    if (!repoUrl.trim()) {
      showToast("Repository URL is empty", "error");
      return;
    }

    try {
      setIsCloning(true);
      setIndexingProgress({ progress: 5, stage: "Repository validation", message: "Checking workspace..." });
      setStatus({
        tone: "loading",
        label: "Cloning Repository",
        message: "Cloning remote repository files...",
      });

      const cloneRes = await cloneRepository(repoUrl.trim());
      
      const wsUrl = `${API_BASE_URL.replace("http", "ws")}/indexer/progress?token=${localStorage.getItem("codepilot_token") || ""}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket.send(JSON.stringify({ repo_path: cloneRes.path }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setIndexingProgress(data);
        
        setStatus({
          tone: "loading",
          label: `Indexing: ${data.stage}`,
          message: data.message,
        });

        if (data.stage === "Completed") {
          setRepoPath(cloneRes.path);
          setMetrics({
            filesIndexed: data.data.files_indexed,
            chunksIndexed: data.data.chunks_indexed,
          });
          
          setStatus({
            tone: "success",
            label: "Ready",
            message: `Successfully indexed ${data.data.files_indexed} files and ${data.data.chunks_indexed} code symbols!`,
          });

          fetchRepositories().then(setHistory);
          setIndexingProgress(null);
          setIsCloning(false);
          socket.close();
        } else if (data.stage === "Failed") {
          setStatus({
            tone: "error",
            label: "System Error",
            message: data.message,
          });
          showToast(data.message, "error");
          setIndexingProgress(null);
          setIsCloning(false);
          socket.close();
        }
      };

      socket.onerror = (err) => {
        console.error("WS Error:", err);
        setStatus({
          tone: "error",
          label: "System Error",
          message: "WebSocket connection error during indexing.",
        });
        setIndexingProgress(null);
        setIsCloning(false);
      };

    } catch (error) {
      console.error(error);
      setRepoPath("");
      setIndexingProgress(null);
      const errMsg = getErrorMessage(error, "Analysis initialization failed. Check repository URL.");
      setStatus({
        tone: "error",
        label: "System Error",
        message: errMsg,
      });
      showToast(errMsg, "error");
      setIsCloning(false);
    }
  }, [repoUrl, showToast, setHistory]);

  return {
    repoUrl,
    setRepoUrl,
    repoPath,
    setRepoPath,
    isCloning,
    indexingProgress,
    metrics,
    status,
    setStatus,
    clearWorkspace,
    selectRepositoryFromHistory,
    handleDeleteRepository,
    handleIndexRepository,
  };
}
