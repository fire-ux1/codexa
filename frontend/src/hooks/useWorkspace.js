import { useState, useCallback, useRef, useEffect } from "react";
import { fetchFileContent, fetchFileSymbols, saveFileContent } from "../services/api";

export default function useWorkspace() {
  const [openFiles, setOpenFiles] = useState(() => {
    try {
      const saved = localStorage.getItem("codepilot_open_files");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeFile, setActiveFile] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const [dirtyFiles, setDirtyFiles] = useState(new Set());
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [activePanelBottom, setActivePanelBottom] = useState(null); // "architecture" | "graph" | "flow" | "analytics" | "review" | null
  const editorRef = useRef(null);

  // Sync refs to avoid stale closures in callbacks with empty dependencies
  const fileContentsRef = useRef({});
  useEffect(() => {
    fileContentsRef.current = fileContents;
  }, [fileContents]);

  const dirtyFilesRef = useRef(new Set());
  useEffect(() => {
    dirtyFilesRef.current = dirtyFiles;
  }, [dirtyFiles]);

  const activeFileRef = useRef(null);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // On mount, open the active file or first file if openFiles is not empty
  useEffect(() => {
    const savedActive = localStorage.getItem("codepilot_active_file");
    if (savedActive && openFiles.includes(savedActive)) {
      openFile(savedActive);
    } else if (openFiles.length > 0) {
      openFile(openFiles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFile = useCallback(async (filePath, jumpToLine = null) => {
    if (!filePath) return;

    // Add to open files list if not already there
    setOpenFiles(prev => {
      const next = prev.includes(filePath) ? prev : [...prev, filePath];
      localStorage.setItem("codepilot_open_files", JSON.stringify(next));
      return next;
    });

    setActiveFile(filePath);
    localStorage.setItem("codepilot_active_file", filePath);
    setActiveSymbol("");

    // Check cache within functional update to avoid recreating openFile callback
    setFileContents(currentContents => {
      if (currentContents[filePath] !== undefined) {
        // Already cached, just load symbols and jump to line if requested
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

      // Not cached, fetch from backend API
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
        } catch (err) {
          setFileContents(prev => ({ ...prev, [filePath]: `// Error loading file: ${err.message}` }));
          setSymbols([]);
        } finally {
          setIsFileLoading(false);
        }
      })();

      return currentContents;
    });
  }, []);

  const closeFile = useCallback((filePath) => {
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

  const updateFileContent = useCallback((filePath, newContent) => {
    if (!filePath) return;
    setFileContents(prev => ({ ...prev, [filePath]: newContent }));
    setDirtyFiles(prev => {
      if (prev.has(filePath)) return prev;
      const next = new Set(prev);
      next.add(filePath);
      return next;
    });
  }, []);

  const saveFile = useCallback(async (filePath) => {
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
    } catch (err) {
      console.error("Save file failed:", err);
      alert(`Failed to save file: ${err.message}`);
      return false;
    }
  }, []);

  const jumpToSymbol = useCallback((symbol) => {
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
