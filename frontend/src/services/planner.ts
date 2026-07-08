import api from "./api";

export async function createImplementationPlan(repoPath: string, requestMessage: string): Promise<any> {
  const response = await api.post("/planner/plan", {
    repo_path: repoPath,
    message: requestMessage,
  });
  return response.data;
}

export async function executePlanStep(repoPath: string, file: string, action: string, instruction: string): Promise<any> {
  const response = await api.post("/planner/execute-step", {
    repo_path: repoPath,
    file_path: file,
    action,
    instruction,
  });
  return response.data;
}
