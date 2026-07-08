import { useEffect, useRef } from "react";
import { collaborationStore } from "../stores/collaborationStore";

export function useCollaborationSocket(projectId: string, token: string = "") {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const backoffRef = useRef<number>(1000); // Start with 1 second delay

  useEffect(() => {
    if (!projectId) return;

    collaborationStore.setProjectId(projectId);

    function connect() {
      const isSecure = window.location.protocol === "https:";
      const wsProtocol = isSecure ? "wss:" : "ws:";

      let host = window.location.host;
      if (!host || window.location.protocol === "file:") {
        host = "localhost:8000";
      }

      const wsUrl = `${wsProtocol}//${host}/api/v1/collaboration/events?project_id=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;

      console.log(`[WS Collaboration Client] Connecting to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS Collaboration Client] Connected successfully.");
        collaborationStore.setConnected(true);
        backoffRef.current = 1000; // Reset backoff delay on success
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle heartbeat pings
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }

          // Handle standardized events
          const { type, payload } = data;
          if (type === "comment_added") {
            const comment = payload.comment;
            collaborationStore.addComment(comment);
            collaborationStore.addNotification({
              text: `${comment.author} added a comment on ${comment.file}`,
            });
          } else if (type === "comment_deleted") {
            collaborationStore.deleteComment(payload.comment_id);
            collaborationStore.addNotification({
              text: `Comment deleted in workspace.`,
            });
          }
        } catch (err) {
          console.error("[WS Collaboration Client] Message parse error:", err);
        }
      };

      ws.onclose = (event) => {
        console.log(
          `[WS Collaboration Client] Connection closed: Code=${event.code}`
        );
        collaborationStore.setConnected(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff if not clean shutdown
        if (event.code !== 1000 && event.code !== 1005) {
          const delay = backoffRef.current;
          console.log(
            `[WS Collaboration Client] Attempting reconnect in ${delay}ms...`
          );

          backoffRef.current = Math.min(backoffRef.current * 2, 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (err) => {
        console.error(
          "[WS Collaboration Client] Socket encountered error:",
          err
        );
      };
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [projectId, token]);

  return {
    store: collaborationStore,
  };
}
