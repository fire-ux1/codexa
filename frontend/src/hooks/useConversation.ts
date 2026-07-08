import { useState, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  runWorkspaceChatStream,
  fetchWorkspaceConversation,
  fetchWorkspaceConversations,
} from "../services/workspace";

export interface Message {
  role: string;
  content: string;
  streaming?: boolean;
}

export default function useConversation() {
  const [conversationId, setConversationId] = useState<string>(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async ({
      repo,
      file,
      symbol,
      selection,
      message,
    }: {
      repo: string;
      file?: string | null;
      symbol?: string | null;
      selection?: string | null;
      message: string;
    }) => {
      if (!message.trim()) return;

      // Set AI chat flag for Welcome checklist
      localStorage.setItem("codepilot_ai_asked", "true");

      // Optimistically add user message
      const userMsg: Message = { role: "user", content: message };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      abortControllerRef.current = new AbortController();

      // Placeholder for assistant
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", streaming: true },
      ]);

      try {
        const response = await runWorkspaceChatStream({
          repo,
          file,
          symbol,
          selection,
          conversation_id: conversationId,
          message,
        });

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable");

        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let accumulated = "";

        const processLines = (text: string) => {
          buffer += text;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.type === "token") {
                accumulated += parsed.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: accumulated,
                    streaming: true,
                  };
                  return updated;
                });
              }
            } catch {
              /* ignore */
            }
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            if (buffer.trim()) processLines("\n");
            break;
          }
          processLines(decoder.decode(value));
        }

        // Finalize streaming
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: accumulated,
            streaming: false,
          };
          return updated;
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `Error: ${err.message}`,
              streaming: false,
            };
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [conversationId]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setMessages((prev) => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg && lastMsg.streaming) {
        updated[updated.length - 1] = { ...lastMsg, streaming: false };
      }
      return updated;
    });
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationId(uuidv4());
    setMessages([]);
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const session = await fetchWorkspaceConversation(sessionId);
      setConversationId(session.conversation_id);
      setMessages(session.messages || []);
      return session;
    } catch (err) {
      console.error("Failed to load session:", err);
      return null;
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await fetchWorkspaceConversations();
      setSessions(list);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    conversationId,
    messages,
    isStreaming,
    sessions,
    sendMessage,
    stopStreaming,
    startNewConversation,
    loadSession,
    refreshSessions,
  };
}
