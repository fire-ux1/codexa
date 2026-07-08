import api from "./api";

/**
 * Fetch local git status (active branch, dirty flag, staged, unstaged, untracked).
 */
export async function fetchGitStatus(repoPath: string): Promise<any> {
  const response = await api.get(`/git/status?repo=${encodeURIComponent(repoPath)}`);
  return response.data;
}

/**
 * Fetch git commit history, optionally filtered by file.
 */
export async function fetchGitHistory(repoPath: string, filePath: string | null = null, maxCount: number = 20): Promise<any> {
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
export async function fetchGitBlame(repoPath: string, filePath: string): Promise<any> {
  const response = await api.get(`/git/blame?repo=${encodeURIComponent(repoPath)}&file=${encodeURIComponent(filePath)}`);
  return response.data;
}

/**
 * Fetch unified diff between branches, commits or workspaces.
 */
export async function fetchGitDiff(repoPath: string, target: string | null = null, source: string | null = null): Promise<any> {
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
export async function suggestCommitMessage(repoPath: string): Promise<any> {
  const response = await api.post("/git/commit-message", {
    repo: repoPath,
  });
  return response.data;
}

/**
 * Explains a specific commit with AI.
 */
export async function fetchExplainCommit(repoPath: string, hexsha: string): Promise<any> {
  const response = await api.get(`/git/explain-commit?repo=${encodeURIComponent(repoPath)}&hexsha=${hexsha}`);
  return response.data;
}

/**
 * Run simulated PR review comparing source and target branches.
 */
export async function reviewPullRequest(repoPath: string, source: string, target: string): Promise<any> {
  const response = await api.post("/git/review", {
    repo: repoPath,
    source,
    target,
  });
  return response.data;
}
