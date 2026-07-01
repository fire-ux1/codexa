import api, { API_BASE_URL } from "./api";

/**
 * Streams the generated code patch, summary, and unified diff.
 */
export function runPatchStream(payload) {
  return fetch(`${API_BASE_URL}/ai/patch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("codepilot_token") || ""}`,
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Commits the approved patch content back to disk.
 */
export async function commitPatch(filePath, content) {
  const response = await api.post("/ai/apply", {
    file_path: filePath,
    content,
  });
  return response.data;
}
