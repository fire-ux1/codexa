import api from "./api";

export async function fetchOrganizations() {
  const response = await api.get("/collaboration/organizations");
  return response.data;
}

export async function createOrganization(name) {
  const response = await api.post("/collaboration/organizations", { name });
  return response.data;
}

export async function fetchProjects(orgId) {
  const response = await api.get(`/collaboration/projects?org_id=${encodeURIComponent(orgId)}`);
  return response.data;
}

export async function createProject(orgId, repoId, name) {
  const response = await api.post("/collaboration/projects", {
    org_id: orgId,
    repository_id: repoId,
    name,
  });
  return response.data;
}

export async function fetchComments(projectId, file = null) {
  let url = `/collaboration/comments?project_id=${encodeURIComponent(projectId)}`;
  if (file) {
    url += `&file=${encodeURIComponent(file)}`;
  }
  const response = await api.get(url);
  return response.data;
}

export async function addComment(projectId, file, line, commentText) {
  const response = await api.post("/collaboration/comments", {
    project_id: projectId,
    file,
    line,
    comment_text: commentText,
  });
  return response.data;
}

export async function deleteComment(commentId) {
  const response = await api.delete(`/collaboration/comments/${commentId}`);
  return response.data;
}

export async function fetchProjectActivity(projectId) {
  const response = await api.get(`/collaboration/activity?project_id=${encodeURIComponent(projectId)}`);
  return response.data;
}
