import { useEffect, useState } from "react";
import { fetchRepositoryFiles } from "../../services/api";
import FileTreeNode, { TreeNode } from "./FileTreeNode";

interface FileExplorerProps {
  repoPath: string;
  selectedPath: string;
  onOpenFile: (path: string) => void;
}

interface RawTreeNode {
  name: string;
  path?: string;
  extension?: string;
  isDir: boolean;
  children: Record<string, any> | null;
}

export default function FileExplorer({ repoPath, selectedPath, onOpenFile }: FileExplorerProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath) return;

    const loadFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchRepositoryFiles(repoPath);

        // Reconstruct flat array into tree structure
        const root: RawTreeNode = { name: "root", isDir: true, children: {} };

        res.forEach((file) => {
          const relPath = file.path
            .replace(repoPath, "")
            .replace(/\\/g, "/")
            .replace(/^\//, "");
          const parts = relPath.split("/");

          let current = root;
          parts.forEach((part: string, index: number) => {
            const isLast = index === parts.length - 1;
            if (current.children && !current.children[part]) {
              current.children[part] = {
                name: part,
                path: file.path,
                extension: part.includes(".") ? part.split(".").pop() : undefined,
                isDir: !isLast,
                children: isLast ? null : {},
              };
            }
            if (current.children) {
              current.children = current.children as Record<string, any>;
              current = current.children[part];
            }
          });
        });

        const convertToArray = (node: any): TreeNode => {
          if (!node.isDir) return node as TreeNode;
          const childKeys = Object.keys(node.children || {});
          node.children = childKeys.map((key) => convertToArray(node.children[key]));
          node.children.sort((a: TreeNode, b: TreeNode) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
          });
          return node as TreeNode;
        };

        const finalTree = convertToArray(root).children || [];
        setTree(finalTree);
      } catch (err) {
        console.error("Failed to load repo files:", err);
        setError("Failed to load repository files.");
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [repoPath]);

  return (
    <div className="p-5 rounded-3xl border border-border bg-panel shadow-lg space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border select-none">
        <h3 className="text-xs uppercase font-bold tracking-wider text-muted font-mono">
          File Explorer
        </h3>
        {loading && (
          <span className="w-3.5 h-3.5 border border-accent/20 border-t-accent rounded-full animate-spin inline-block"></span>
        )}
      </div>

      {error ? (
        <p className="text-xs text-danger italic py-2">{error}</p>
      ) : tree.length === 0 && !loading ? (
        <p className="text-xs text-muted italic py-2">No files found.</p>
      ) : (
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1 scrollbar-thin">
          {tree.map((node, index) => (
            <FileTreeNode
              key={index}
              node={node}
              selectedPath={selectedPath}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
