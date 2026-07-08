import { useState } from "react";
import { IconFolder, IconCode } from "../icons/Icons";

export interface TreeNode {
  name: string;
  path: string;
  extension?: string;
  isDir: boolean;
  children: TreeNode[] | null;
}

interface FileTreeNodeProps {
  node: TreeNode;
  selectedPath: string;
  onOpenFile: (path: string) => void;
}

export default function FileTreeNode({ node, selectedPath, onOpenFile }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleToggle = () => {
    if (node.isDir) {
      setIsOpen(!isOpen);
    } else {
      onOpenFile(node.path);
    }
  };

  const getFileIconColor = (ext?: string): string => {
    if (!ext) return "text-muted";
    const e = ext.toLowerCase();
    if (e === ".py") return "text-secondary";
    if (e === ".js" || e === ".jsx") return "text-accent";
    if (e === ".ts" || e === ".tsx") return "text-blue-400";
    if (e === ".html") return "text-orange-500";
    if (e === ".css") return "text-teal-400";
    if (e === ".json") return "text-yellow-300";
    if (e === ".go") return "text-cyan-400";
    if (e === ".rs") return "text-orange-400";
    if (e === ".java") return "text-red-400";
    return "text-text";
  };

  const isSelected = selectedPath === node.path;

  return (
    <div className="select-none font-mono">
      <div
        onClick={handleToggle}
        className={`flex items-center gap-2 py-1.5 px-2.5 rounded-xl cursor-pointer transition-all duration-200 text-xs ${
          isSelected
            ? "bg-accent/15 text-accent font-semibold border-l-2 border-accent shadow-sm"
            : "text-text hover:text-text-strong hover:bg-panel-alt"
        }`}
      >
        {node.isDir ? (
          <>
            <span
              className={`text-[9px] text-muted transition-transform duration-200 shrink-0 w-3 text-center ${
                isOpen ? "rotate-90" : ""
              }`}
            >
              ▶
            </span>
            <IconFolder className="w-4 h-4 text-secondary shrink-0" />
            <span className="truncate">{node.name}</span>
          </>
        ) : (
          <>
            <span className="shrink-0 w-3"></span>
            <IconCode className={`w-4 h-4 shrink-0 ${getFileIconColor(node.extension)}`} />
            <span className="truncate">{node.name}</span>
          </>
        )}
      </div>

      {node.isDir && isOpen && node.children && (
        <div className="mt-1 border-l border-border ml-3.5 pl-2 space-y-1">
          {node.children.map((child, index) => (
            <FileTreeNode
              key={index}
              node={child}
              selectedPath={selectedPath}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
