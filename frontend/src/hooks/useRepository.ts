import { useState, useCallback } from "react";
import {
  cloneRepository,
  deleteRepository,
  fetchRepositories,
  getErrorMessage,
  API_BASE_URL,
} from "../services/api";
import type { IndexingProgressData, Repository } from "../services/api";

export interface WorkspaceStatus {
  tone: "idle" | "loading" | "success" | "error";
  label: string;
  message: string;
}

export interface RepositoryMetrics {
  filesIndexed: number;
  chunksIndexed: number;
}

export interface UseRepositoryResult {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  accessToken: string;
  setAccessToken: (token: string) => void;
  repoPath: string;
  setRepoPath: (path: string) => void;
  isCloning: boolean;
  indexingProgress: IndexingProgressData | null;
  metrics: RepositoryMetrics;
  status: WorkspaceStatus;
  setStatus: (status: WorkspaceStatus) => void;
  clearWorkspace: () => void;
  selectRepositoryFromHistory: (repo: Repository) => void;
  handleDeleteRepository: (e: React.MouseEvent, repoId: string | number) => Promise<void>;
  handleIndexRepository: () => Promise<void>;
}

/**
 * Type guard for messages coming off the indexing-progress WebSocket.
 * The WS payload isn't validated by the backend contract at build time the
 * way REST responses are, so we do a minimal runtime shape check here rather
 * than blindly trusting JSON.parse's `any`. Worth swapping for a zod schema
 * once zod is wired in for env validation — same pattern applies here.
 */
function isIndexingProgressData(value: unknown): value is IndexingProgressData {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).progress === "number" &&
    typeof (value as Record<string, unknown>).stage === "string" &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}

export default function useRepository(
  _token: string | null | undefined,
  showToast: (message: string, type: "success" | "error") => void,
  history: Repository[],
  setHistory: (list: Repository[]) => void
): UseRepositoryResult {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [repoPath, setRepoPath] = useState<string>("");
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgressData | null>(null);
  const [metrics, setMetrics] = useState<RepositoryMetrics>({ filesIndexed: 0, chunksIndexed: 0 });
  const [status, setStatus] = useState<WorkspaceStatus>({
    tone: "idle",
    label: "Workspace Status",
    message: "Welcome to CodePilot. Choose a repository or index a new one.",
  });

  const clearWorkspace = useCallback(() => {
    setRepoPath("");
    setAccessToken("");
    setMetrics({ filesIndexed: 0, chunksIndexed: 0 });
    setIndexingProgress(null);
    setStatus({
      tone: "idle",
      label: "Workspace Status",
      message: "Ready to index a new repository.",
    });
  }, []);

  const selectRepositoryFromHistory = useCallback((repo: Repository) => {
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

  const handleDeleteRepository = useCallback(
    async (e: React.MouseEvent, repoId: string | number) => {
      e.stopPropagation();
      if (
        !confirm(
          "Are you sure you want to delete this repository index? This deletes the SQLite record, ChromaDB collection, and cloned folder."
        )
      ) {
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
    },
    [repoPath, history, setHistory, showToast, clearWorkspace]
  );

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

      const cloneRes = await cloneRepository(repoUrl.trim(), accessToken.trim() || undefined);

      const wsUrl = `${API_BASE_URL.replace("http", "ws")}/indexer/progress?token=${localStorage.getItem("codepilot_token") || ""}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket.send(JSON.stringify({ repo_path: cloneRes.path }));
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch (parseError) {
          console.error("Indexing WS: failed to parse message", parseError);
          return;
        }

        if (!isIndexingProgressData(parsed)) {
          console.error("Indexing WS: unexpected message shape", parsed);
          return;
        }
        const data = parsed;
        setIndexingProgress(data);

        setStatus({
          tone: "loading",
          label: `Indexing: ${data.stage}`,
          message: data.message,
        });

        if (data.stage === "Completed") {
          setRepoPath(cloneRes.path);
          if (data.data) {
            setMetrics({
              filesIndexed: data.data.files_indexed,
              chunksIndexed: data.data.chunks_indexed,
            });
            setStatus({
              tone: "success",
              label: "Ready",
              message: `Successfully indexed ${data.data.files_indexed} files and ${data.data.chunks_indexed} code symbols!`,
            });
          } else {
            setStatus({
              tone: "success",
              label: "Ready",
              message: "Indexing completed.",
            });
          }

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

      socket.onerror = (err: Event) => {
        console.error("WS Error:", err);
        setStatus({
          tone: "error",
          label: "System Error",
          message: "WebSocket connection error during indexing.",
        });
        setIndexingProgress(null);
        setIsCloning(false);
      };
    } catch (error: unknown) {
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
  }, [repoUrl, accessToken, showToast, setHistory]);

  return {
    repoUrl,
    setRepoUrl,
    accessToken,
    setAccessToken,
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