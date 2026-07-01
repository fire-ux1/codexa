import { API_BASE_URL } from "./api";

/**
 * Streams the coordinated multi-agent chat response.
 */
export function runAgentChatStream(payload) {
  return fetch(`${API_BASE_URL}/ai/agents/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("codepilot_token") || ""}`,
    },
    body: JSON.stringify(payload),
  });
}
