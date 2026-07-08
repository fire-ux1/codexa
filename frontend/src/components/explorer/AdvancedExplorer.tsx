import React, { useEffect, useState, useCallback, useRef } from "react";
import { Folder, FolderOpen, FileCode, Search, Minimize2, Maximize2, Plus, Sparkles, AlertCircle, FileText } from "lucide-react";
import { fetchRepositoryFiles } from "../../services/api";

export interface FlatFileItem {
  name: string;
  path: string;
  size: number;
  lines: number;
  extension?: string;
  [key: string]: any;
}

export interface AdvTreeNode {
  name: string;
  path: string;
  extension?: string;
  isDir: boolean;
  children: any; // Raw or built array
  forceOpen?: boolean;
}

interface AdvancedExplorerProps {
  repoPath: string;
  selectedPath: string;
  onOpenFile: (path: string) => void;
  gitStatus?: any;
  onTriggerContextAction?: (actionId: string, path: string) => void;
}

interface HoverFileInfo {
  name: string;
  path: string;
  gitDecoration: any;
  lines?: number | string;
  size?: number | string;
}

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  isDir: boolean;
}

export default function AdvancedExplorer({
  repoPath,
  selectedPath,
  onOpenFile,
  gitStatus = null,
  onTriggerContextAction,
}: AdvancedExplorerProps) {
  const [tree, setTree] = useState<AdvTreeNode[]>([]);
  const [flatFiles, setFlatFiles] = useState<FlatFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Expand/collapse state manager
  const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(null);
  
  // Hover preview states
  const [hoveredFile, setHoveredFile] = useState<HoverFileInfo | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<any>(null);

  // Context Menu states
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Load and build file tree
  const loadFiles = useCallback(async () => {
    if (!repoPath) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchRepositoryFiles(repoPath);
      setFlatFiles(res.files || []);

      // Build tree structure
      const root: any = { name: "root", isDir: true, children: {} };
      (res.files || []).forEach((file: any) => {
        const relPath = file.path
          .replace(repoPath, "")
          .replace(/\\/g, "/")
          .replace(/^\//, "");
        const parts = relPath.split("/");

        let current = root;
        parts.forEach((part: string, index: number) => {
          const isLast = index === parts.length - 1;
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: file.path,
              extension: file.extension,
              isDir: !isLast,
              children: isLast ? null : {},
            };
          }
          current = current.children[part];
        });
      });

      const convertToArray = (node: any): AdvTreeNode => {
        if (!node.isDir) return node as AdvTreeNode;
        const childKeys = Object.keys(node.children || {});
        node.children = childKeys.map((key) => convertToArray(node.children[key]));
        node.children.sort((a: AdvTreeNode, b: AdvTreeNode) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        });
        return node as AdvTreeNode;
      };

      const finalTree = convertToArray(root).children || [];
      setTree(finalTree);
    } catch (err) {
      console.error("Failed to load repo files:", err);
      setError("Failed to load directory files.");
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Handle outside click to close context menu
  useEffect(() => {
    const handleOutsideClick = () => setContextMenu(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Filter tree nodes recursively based on searchQuery
  const filterTree = (nodes: AdvTreeNode[], query: string): AdvTreeNode[] => {
    if (!query) return nodes;
    const cleanQuery = query.toLowerCase();
    
    return nodes
      .map((node) => {
        if (node.isDir) {
          const filteredChildren = filterTree(node.children || [], query);
          if (filteredChildren.length > 0 || node.name.toLowerCase().includes(cleanQuery)) {
            return { ...node, children: filteredChildren, forceOpen: true };
          }
        } else {
          if (node.name.toLowerCase().includes(cleanQuery)) {
            return node;
          }
        }
        return null;
      })
      .filter(Boolean) as AdvTreeNode[];
  };

  const filteredTree = filterTree(tree, searchQuery);

  // Trigger Context Actions
  const handleContextAction = (actionId: string, path: string) => {
    if (onTriggerContextAction) {
      onTriggerContextAction(actionId, path);
    }
    setContextMenu(null);
  };

  return (
    <div className="flex flex-col h-full bg-panel overflow-hidden select-none relative">
      
      {/* File Search Bar */}
      <div className="p-3 border-b border-border bg-panel-alt-2/40 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted font-mono">File Explorer</span>
          
          {/* Toolbar */}
          <div className="flex gap-1">
            <button
              onClick={() => setGlobalExpanded(true)}
              className="p-1 rounded hover:bg-panel-alt text-muted hover:text-text-strong cursor-pointer"
              title="Expand All Folders"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setGlobalExpanded(false)}
              className="p-1 rounded hover:bg-panel-alt text-muted hover:text-text-strong cursor-pointer"
              title="Collapse All Folders"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleContextAction("new_file", repoPath)}
              className="p-1 rounded hover:bg-panel-alt text-muted hover:text-text-strong cursor-pointer"
              title="Create New File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Query Input */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-bg border border-border rounded-lg shadow-inner">
          <Search className="w-3.5 h-3.5 text-muted shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="bg-transparent border-none outline-none font-mono text-[10px] text-text-strong w-full placeholder-muted"
          />
        </div>
      </div>

      {/* Explorer Tree Output */}
      <div className="flex-grow flex-1 overflow-y-auto p-2 scrollbar-thin min-h-0">
        {loading ? (
          <div className="p-6 text-center text-muted font-mono text-[10px] animate-pulse">Scanning workspace...</div>
        ) : error ? (
          <div className="p-6 text-center text-danger font-mono text-[10px] italic">{error}</div>
        ) : filteredTree.length === 0 ? (
          <div className="p-6 text-center text-muted font-mono text-[10px] italic">No files found</div>
        ) : (
          <div className="space-y-0.5">
            {filteredTree.map((node, index) => (
              <AdvFileTreeNode
                key={index}
                node={node}
                selectedPath={selectedPath}
                onOpenFile={onOpenFile}
                gitStatus={gitStatus}
                globalExpanded={globalExpanded}
                onContextMenu={(e, path, isDir) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
                }}
                onHoverFile={(fileInfo, rect) => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                  if (fileInfo) {
                    hoverTimeoutRef.current = setTimeout(() => {
                      const matched = flatFiles.find((f) => f.path === fileInfo.path);
                      setHoveredFile({
                        ...fileInfo,
                        lines: matched?.lines ?? "LOC: N/A",
                        size: matched?.size ? `${(matched.size / 1024).toFixed(1)} KB` : "N/A",
                      });
                      if (rect) {
                        setHoverPosition({ x: rect.right + 10, y: rect.top });
                      }
                    }, 500);
                  } else {
                    setHoveredFile(null);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 bg-panel border border-border rounded-xl shadow-2xl p-1.5 min-w-[140px] font-mono text-[10px] space-y-0.5 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleContextAction("explain", contextMenu.path)}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-accent hover:text-bg text-text flex items-center gap-1.5 cursor-pointer font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent group-hover:text-bg" />
            <span>Explain File</span>
          </button>
          <button
            onClick={() => handleContextAction("review", contextMenu.path)}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-danger hover:text-bg text-text flex items-center gap-1.5 border-b border-border/40 pb-1.5 mb-1 cursor-pointer font-semibold transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-danger" />
            <span>Review Code</span>
          </button>
          
          <button
            onClick={() => handleContextAction("rename", contextMenu.path)}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-panel-alt text-text cursor-pointer transition-colors"
          >
            Rename File
          </button>
          <button
            onClick={() => handleContextAction("delete", contextMenu.path)}
            className="w-full text-left px-2.5 py-1.5 rounded hover:bg-danger-bg text-danger cursor-pointer transition-colors"
          >
            Delete File
          </button>
        </div>
      )}

      {/* Hover Preview Tooltip Card */}
      {hoveredFile && (
        <div
          style={{ top: `${hoverPosition.y}px`, left: `${hoverPosition.x}px` }}
          className="fixed z-50 w-[240px] bg-panel border border-border rounded-2xl p-4 shadow-2xl font-sans text-xs space-y-2.5 select-text animate-fade-in pointer-events-none border-l-4 border-l-accent"
        >
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <FileText className="w-4 h-4 text-accent" />
            <span className="font-bold text-text-strong truncate max-w-[170px]">{hoveredFile.name}</span>
          </div>
          <div className="space-y-1.5 text-[10px] text-soft font-mono">
            <div className="flex justify-between">
              <span>Lines count:</span>
              <span className="text-text-strong font-bold">{hoveredFile.lines} LOC</span>
            </div>
            <div className="flex justify-between">
              <span>File size:</span>
              <span className="text-text-strong font-bold">{hoveredFile.size}</span>
            </div>
            <div className="flex justify-between">
              <span>Git Status:</span>
              <span className={`font-bold ${hoveredFile.gitDecoration?.color ?? "text-muted"}`}>
                {hoveredFile.gitDecoration?.label ?? "Clean / Tracked"}
              </span>
            </div>
          </div>
          <p className="text-[9.5px] text-muted leading-relaxed pt-1.5 border-t border-border font-body">
            Click to view this file. Right click to run audits and AI diagnostics.
          </p>
        </div>
      )}

    </div>
  );
}

interface AdvFileTreeNodeProps {
  node: AdvTreeNode;
  selectedPath: string;
  onOpenFile: (path: string) => void;
  gitStatus: any;
  globalExpanded: boolean | null;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
  onHoverFile: (fileInfo: any, rect: DOMRect | null) => void;
}

function AdvFileTreeNode({
  node,
  selectedPath,
  onOpenFile,
  gitStatus,
  globalExpanded,
  onContextMenu,
  onHoverFile,
}: AdvFileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);

  // Bind forceOpen or global collapse shifts
  useEffect(() => {
    if (node.forceOpen) {
      setIsOpen(true);
    }
  }, [node.forceOpen]);

  useEffect(() => {
    if (globalExpanded !== null && node.isDir) {
      setIsOpen(globalExpanded);
    }
  }, [globalExpanded, node.isDir]);

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
    if (e === ".md") return "text-violet";
    return "text-text";
  };

  // Determine Git Decorations state
  const getGitDecoration = () => {
    if (node.isDir || !gitStatus) return null;
    const relPath = node.path.replace(/\\/g, "/");
    
    // Check modified
    const isModified = (gitStatus.unstaged || []).some((f: string) => {
      const gitRel = f.replace(/\\/g, "/");
      return relPath.endsWith(gitRel);
    });

    if (isModified) {
      return {
        badge: "M",
        color: "text-accent",
        label: "Modified",
      };
    }
    return null;
  };

  const gitDecoration = getGitDecoration();
  const isSelected = selectedPath === node.path;

  return (
    <div className="select-none font-mono">
      <div
        ref={ref}
        onClick={handleToggle}
        onContextMenu={(e) => onContextMenu(e, node.path, node.isDir)}
        onMouseEnter={() => {
          if (!node.isDir && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            onHoverFile({ name: node.name, path: node.path, gitDecoration }, rect);
          }
        }}
        onMouseLeave={() => {
          if (!node.isDir) onHoverFile(null, null);
        }}
        className={`flex items-center gap-2 py-1.5 px-2.5 rounded-xl cursor-pointer transition-all duration-150 text-[11px] justify-between relative group ${
          isSelected
            ? "bg-accent/15 text-accent font-semibold border-l-2 border-accent shadow-sm"
            : "text-text hover:text-text-strong hover:bg-panel-alt"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {node.isDir ? (
            <>
              <span className="text-[8px] text-muted shrink-0 w-2.5 text-center">
                {isOpen ? "▼" : "▶"}
              </span>
              {isOpen ? (
                <FolderOpen className="w-3.5 h-3.5 text-secondary shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-secondary shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </>
          ) : (
            <>
              <span className="shrink-0 w-2.5"></span>
              <FileCode className={`w-3.5 h-3.5 shrink-0 ${getFileIconColor(node.extension)}`} />
              <span className={`truncate ${gitDecoration?.color ?? ""}`}>{node.name}</span>
            </>
          )}
        </div>

        {/* Git decoration badge on the right */}
        {gitDecoration && (
          <span className={`text-[8.5px] font-bold font-mono px-1 rounded-sm ${gitDecoration.color} bg-panel-alt border border-border`}>
            {gitDecoration.badge}
          </span>
        )}
      </div>

      {node.isDir && isOpen && node.children && (
        <div className="mt-0.5 border-l border-border ml-3.5 pl-2 space-y-0.5">
          {node.children.map((child: any, index: number) => (
            <AdvFileTreeNode
              key={index}
              node={child}
              selectedPath={selectedPath}
              onOpenFile={onOpenFile}
              gitStatus={gitStatus}
              globalExpanded={globalExpanded}
              onContextMenu={onContextMenu}
              onHoverFile={onHoverFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
