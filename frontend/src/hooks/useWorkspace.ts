import { useState, useCallback, useRef, useEffect } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { fetchFileContent, fetchFileSymbols, saveFileContent } from "../services/api";

export interface SymbolItem {
  name: string;
  line: number;
  column?: number;
  kind?: string; // e.g. "function" | "class" | "variable" — adjust to match your backend's actual symbol kinds
}

export interface UseWorkspaceResult {
  openFiles: string[];
  activeFile: string | null;
  activeFileContent: string;
  dirtyFiles: Set<string>;
  isFileLoading: boolean;
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;
  symbols: SymbolItem[];
  editorRef: React.MutableRefObject<MonacoEditor.IStandaloneCodeEditor | null>;
  openFile: (filePath: string, jumpToLine?: number | null) => Promise<void>;
  closeFile: (filePath: string) => void;
  updateFileContent: (filePath: string, newContent: string) => void;
  saveFile: (filePath?: string) => Promise<boolean>;
  jumpToSymbol: (symbol: SymbolItem) => void;
  activePanelBottom: string | null;
  setActivePanelBottom: (panel: string | null) => void;
  closeBottomPanel: () => void;
}

/** Narrow an unknown catch value to a human-readable message without assuming its shape. */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unknown error";
}

export default function useWorkspace(): UseWorkspaceResult {
  const [openFiles, setOpenFiles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("codepilot_open_files");
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
  const [activeSymbol, setActiveSymbol] = useState<string>("");
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [activePanelBottom, setActivePanelBottom] = useState<string | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  // Sync refs to avoid stale closures in callbacks with empty dependencies
  const fileContentsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    fileContentsRef.current = fileContents;
  }, [fileContents]);

  const dirtyFilesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    dirtyFilesRef.current = dirtyFiles;
  }, [dirtyFiles]);

  const activeFileRef = useRef<string | null>(null);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  const openFile = useCallback(async (filePath: string, jumpToLine: number | null = null) => {
    if (!filePath) return;

    setOpenFiles(prev => {
      const next = prev.includes(filePath) ? prev : [...prev, filePath];
      localStorage.setItem("codepilot_open_files", JSON.stringify(next));
      return next;
    });

    setActiveFile(filePath);
    localStorage.setItem("codepilot_active_file", filePath);
    setActiveSymbol("");

    setFileContents(currentContents => {
      if (currentContents[filePath] !== undefined) {
        (async () => {
          try {
            const syms = await fetchFileSymbols(filePath);
            setSymbols(syms || []);
          } catch {
            setSymbols([]);
          }
          if (jumpToLine && editorRef.current) {
            setTimeout(() => {
              const editor = editorRef.current;
              if (editor) {
                editor.revealLineInCenter(jumpToLine);
                editor.setPosition({ lineNumber: jumpToLine, column: 1 });
                editor.focus();
              }
            }, 300);
          }
        })();
        return currentContents;
      }

      setIsFileLoading(true);
      (async () => {
        try {
          const res = await fetchFileContent(filePath);
          setFileContents(prev => ({ ...prev, [filePath]: res.content }));

          try {
            const syms = await fetchFileSymbols(filePath);
            setSymbols(syms || []);
          } catch {
            setSymbols([]);
          }

          if (jumpToLine && editorRef.current) {
            setTimeout(() => {
              const editor = editorRef.current;
              if (editor) {
                editor.revealLineInCenter(jumpToLine);
                editor.setPosition({ lineNumber: jumpToLine, column: 1 });
                editor.focus();
              }
            }, 300);
          }
        } catch (err: unknown) {
          setFileContents(prev => ({
            ...prev,
            [filePath]: `// Error loading file: ${getErrorMessage(err)}`,
          }));
          setSymbols([]);
        } finally {
          setIsFileLoading(false);
        }
      })();

      return currentContents;
    });
  }, []);

  // On mount, open the active file or first file if openFiles is not empty
  useEffect(() => {
    const savedActive = localStorage.getItem("codepilot_active_file");
    if (savedActive && openFiles.includes(savedActive)) {
      void openFile(savedActive);
    } else if (openFiles.length > 0) {
      void openFile(openFiles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeFile = useCallback((filePath: string) => {
    if (dirtyFilesRef.current.has(filePath)) {
      const confirmClose = window.confirm(
        `${filePath.split(/[\\/]/).pop()} has unsaved changes. Close anyway?`
      );
      if (!confirmClose) return;
    }

    setOpenFiles(prev => {
      const index = prev.indexOf(filePath);
      if (index === -1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      localStorage.setItem("codepilot_open_files", JSON.stringify(next));

      setActiveFile(currActive => {
        if (currActive === filePath) {
          const newActive = next.length > 0 ? next[Math.max(0, index - 1)] : null;
          if (newActive) {
            localStorage.setItem("codepilot_active_file", newActive);
          } else {
            localStorage.removeItem("codepilot_active_file");
          }
          return newActive;
        }
        return currActive;
      });

      return next;
    });

    setDirtyFiles(prev => {
      const next = new Set(prev);
      next.delete(filePath);
      return next;
    });

    setFileContents(prev => {
      const next = { ...prev };
      delete next[filePath];
      return next;
    });
  }, []);

  const updateFileContent = useCallback((filePath: string, newContent: string) => {
    if (!filePath) return;
    setFileContents(prev => ({ ...prev, [filePath]: newContent }));
    setDirtyFiles(prev => {
      if (prev.has(filePath)) return prev;
      const next = new Set(prev);
      next.add(filePath);
      return next;
    });
  }, []);

  const saveFile = useCallback(async (filePath?: string): Promise<boolean> => {
    const targetPath = filePath || activeFileRef.current;
    if (!targetPath) return false;

    const content = fileContentsRef.current[targetPath];
    if (content === undefined) return false;

    try {
      await saveFileContent(targetPath, content);
      setDirtyFiles(prev => {
        const next = new Set(prev);
        next.delete(targetPath);
        return next;
      });
      return true;
    } catch (err: unknown) {
      console.error("Save file failed:", err);
      alert(`Failed to save file: ${getErrorMessage(err)}`);
      return false;
    }
  }, []);

  const jumpToSymbol = useCallback((symbol: SymbolItem) => {
    if (!symbol?.line || !editorRef.current) return;
    setActiveSymbol(symbol.name);
    const editor = editorRef.current;
    editor.revealLineInCenter(symbol.line);
    editor.setPosition({ lineNumber: symbol.line, column: symbol.column || 1 });
    editor.focus();
  }, []);

  const closeBottomPanel = useCallback(() => setActivePanelBottom(null), []);

  const activeFileContent = activeFile ? (fileContents[activeFile] ?? "") : "";

  return {
    openFiles,
    activeFile,
    activeFileContent,
    dirtyFiles,
    isFileLoading,
    activeSymbol,
    setActiveSymbol,
    symbols,
    editorRef,
    openFile,
    closeFile,
    updateFileContent,
    saveFile,
    jumpToSymbol,
    activePanelBottom,
    setActivePanelBottom,
    closeBottomPanel,
  };
}