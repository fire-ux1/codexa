import api from "./api";

export async function generateAsset(repoPath: string, assetType: string): Promise<any> {
  const response = await api.post("/devops/generate", {
    repo_path: repoPath,
    asset_type: assetType,
  });
  return response.data;
}
