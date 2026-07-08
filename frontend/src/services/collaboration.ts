import api from "./api";

export async function fetchOrganizations(): Promise<any> {
  const response = await api.get("/collaboration/organizations");
  return response.data;
}

export async function createOrganization(name: string): Promise<any> {
  const response = await api.post("/collaboration/organizations", { name });
  return response.data;
}

export async function fetchProjects(orgId: string): Promise<any> {
  const response = await api.get(`/collaboration/projects?org_id=${encodeURIComponent(orgId)}`);
  return response.data;
}

export async function createProject(orgId: string, repoId: string, name: string): Promise<any> {
  const response = await api.post("/collaboration/projects", {
    org_id: orgId,
    repository_id: repoId,
    name,
  });
  return response.data;
}

export async function fetchComments(projectId: string, file: string | null = null): Promise<any> {
  let url = `/collaboration/comments?project_id=${encodeURIComponent(projectId)}`;
  if (file) {
    url += `&file=${encodeURIComponent(file)}`;
  }
  const response = await api.get(url);
  return response.data;
}

export async function addComment(
  projectId: string,
  file: string,
  line: number,
  commentText: string
): Promise<any> {
  const response = await api.post("/collaboration/comments", {
    project_id: projectId,
    file,
    line,
    comment_text: commentText,
  });
  return response.data;
}

export async function deleteComment(commentId: string): Promise<any> {
  const response = await api.delete(`/collaboration/comments/${commentId}`);
  return response.data;
}

export async function fetchProjectActivity(projectId: string): Promise<any> {
  const response = await api.get(`/collaboration/activity?project_id=${encodeURIComponent(projectId)}`);
  return response.data;
}
