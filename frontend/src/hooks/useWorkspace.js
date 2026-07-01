import { useState, useCallback, useRef } from "react";
import { fetchFileContent } from "../services/api";
import { fetchFileSymbols } from "../services/api";

export default function useWorkspace() {
  const [activeFile, setActiveFile] = useState(null);
  const [activeFileContent, setActiveFileContent] = useState("");
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState("");
  const [symbols, setSymbols] = useState([]);
  const [activePanelBottom, setActivePanelBottom] = useState(null); // "architecture" | "graph" | "flow" | "analytics" | "review" | null
  const editorRef = useRef(null);

  const openFile = useCallback(async (filePath, jumpToLine = null) => {
    setActiveFile(filePath);
    setActiveFileContent("");
    setActiveSymbol("");
    setIsFileLoading(true);
    try {
      const res = await fetchFileContent(filePath);
      setActiveFileContent(res.content);

      // Load symbols asynchronously
      try {
        const syms = await fetchFileSymbols(filePath);
        setSymbols(syms || []);
      } catch {
        setSymbols([]);
      }

      // Jump to requested line after mount
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
      setActiveFileContent(`// Error loading file: ${err.message}`);
      setSymbols([]);
    } finally {
      setIsFileLoading(false);
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

  return {
    activeFile,
    activeFileContent,
    isFileLoading,
    activeSymbol,
    setActiveSymbol,
    symbols,
    editorRef,
    openFile,
    jumpToSymbol,
    activePanelBottom,
    setActivePanelBottom,
    closeBottomPanel,
  };
}
