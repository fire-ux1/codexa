import api from "./api";

/**
 * Fetch local git status (active branch, dirty flag, staged, unstaged, untracked).
 */
export async function fetchGitStatus(repoPath) {
  const response = await api.get(`/git/status?repo=${encodeURIComponent(repoPath)}`);
  return response.data;
}

/**
 * Fetch git commit history, optionally filtered by file.
 */
export async function fetchGitHistory(repoPath, filePath = null, maxCount = 20) {
  let url = `/git/history?repo=${encodeURIComponent(repoPath)}&max_count=${maxCount}`;
  if (filePath) {
    url += `&file=${encodeURIComponent(filePath)}`;
  }
  const response = await api.get(url);
  return response.data;
}

/**
 * Fetch git blame for a specific file.
 */
export async function fetchGitBlame(repoPath, filePath) {
  const response = await api.get(`/git/blame?repo=${encodeURIComponent(repoPath)}&file=${encodeURIComponent(filePath)}`);
  return response.data;
}

/**
 * Fetch unified diff between branches, commits or workspaces.
 */
export async function fetchGitDiff(repoPath, target = null, source = null) {
  const response = await api.post("/git/diff", {
    repo: repoPath,
    target,
    source,
  });
  return response.data;
}

/**
 * Generates conventional commit message based on staged changes.
 */
export async function suggestCommitMessage(repoPath) {
  const response = await api.post("/git/commit-message", {
    repo: repoPath,
  });
  return response.data;
}

/**
 * Explains a specific commit with AI.
 */
export async function fetchExplainCommit(repoPath, hexsha) {
  const response = await api.get(`/git/explain-commit?repo=${encodeURIComponent(repoPath)}&hexsha=${hexsha}`);
  return response.data;
}

/**
 * Run simulated PR review comparing source and target branches.
 */
export async function reviewPullRequest(repoPath, source, target) {
  const response = await api.post("/git/review", {
    repo: repoPath,
    source,
    target,
  });
  return response.data;
}
