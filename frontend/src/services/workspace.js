import api, { API_BASE_URL } from "./api";

/**
  * Streams conversation completions under current workspace context limits.
  * Uses direct fetch for streams.
  */
export function runWorkspaceChatStream(payload) {
  return fetch(`${API_BASE_URL}/workspace/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("codepilot_token") || ""}`,
    },
    body: JSON.stringify(payload),
  });
}

/**
  * Lists previous user conversation sessions.
  */
export async function fetchWorkspaceConversations() {
  const response = await api.get("/workspace/conversations");
  return response.data;
}

/**
  * Restores details/messages of a single conversation session.
  */
export async function fetchWorkspaceConversation(conversationId) {
  const response = await api.get(`/workspace/conversations/${conversationId}`);
  return response.data;
}
