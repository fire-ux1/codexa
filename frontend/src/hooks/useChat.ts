import { useState, useCallback } from "react";
import { getErrorMessage, API_BASE_URL } from "../services/api";

export interface ChatMessage {
  role: string;
  content: string;
  sources?: any[];
}

export default function useChat(
  repoPath: string | null,
  setStatus: (status: any) => void
) {
  const [question, setQuestion] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  const handleAskQuestion = useCallback(
    async (selectedQuestion: string | null = null) => {
      const query = selectedQuestion || question;
      if (!query.trim()) return;

      const userMsg: ChatMessage = { role: "user", content: query };
      setChatHistory((prev) => [...prev, userMsg]);
      setQuestion("");
      setIsAsking(true);

      setStatus({
        tone: "loading",
        label: "AI Processing",
        message: "Querying index and drafting response...",
      });

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "", sources: [] },
      ]);

      try {
        const response = await fetch(`${API_BASE_URL}/ai/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("codepilot_token") || ""}`,
          },
          body: JSON.stringify({
            question: query.trim(),
            repo_path: repoPath,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        const processLines = (text: string) => {
          buffer += text;
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // keep the last incomplete line

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.type === "sources") {
                setChatHistory((prev) => {
                  const list = [...prev];
                  const last = list[list.length - 1];
                  if (last) {
                    list[list.length - 1] = {
                      ...last,
                      sources: parsed.sources,
                    };
                  }
                  return list;
                });
              } else if (parsed.type === "token") {
                setChatHistory((prev) => {
                  const list = [...prev];
                  const last = list[list.length - 1];
                  if (last) {
                    list[list.length - 1] = {
                      ...last,
                      content: last.content + parsed.token,
                    };
                  }
                  return list;
                });
              } else if (parsed.type === "error") {
                setChatHistory((prev) => {
                  const list = [...prev];
                  const last = list[list.length - 1];
                  if (last) {
                    list[list.length - 1] = {
                      ...last,
                      content: last.content + `\nError: ${parsed.message}`,
                    };
                  }
                  return list;
                });
              }
            } catch (err) {
              console.warn("Parse stream failure:", err, "raw line:", trimmed);
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

        setStatus({
          tone: "success",
          label: "AI Response Completed",
          message: "Streaming completed successfully.",
        });
      } catch (error) {
        console.error(error);
        const errMsg = getErrorMessage(
          error,
          "AI assistant was unable to stream response."
        );
        setChatHistory((prev) => {
          const list = [...prev];
          const last = list[list.length - 1];
          if (last) {
            list[list.length - 1] = {
              ...last,
              content: `Error: ${errMsg}`,
            };
          }
          return list;
        });
        setStatus({
          tone: "error",
          label: "System Error",
          message: errMsg,
        });
      } finally {
        setIsAsking(false);
      }
    },
    [question, repoPath, setStatus]
  );

  return {
    question,
    setQuestion,
    chatHistory,
    setChatHistory,
    isAsking,
    setIsAsking,
    handleAskQuestion,
  };
}
