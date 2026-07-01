import { useState, useCallback } from "react";
import { getEditorLanguage } from "../utils/editorLanguage";

export default function useSelection(filePath) {
  const [selectionText, setSelectionText] = useState("");
  const [selectionRange, setSelectionRange] = useState(null); // null | { startLine, endLine }

  const handleSelectionChange = useCallback((editor) => {
    const selection = editor.getSelection();
    if (!selection) {
      setSelectionText("");
      setSelectionRange(null);
      return;
    }

    const value = editor.getModel()?.getValueInRange(selection);
    if (value && value.trim()) {
      setSelectionText(value);
      setSelectionRange({
        startLine: selection.startLineNumber,
        endLine: selection.endLineNumber,
      });
    } else {
      setSelectionText("");
      setSelectionRange(null);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionText("");
    setSelectionRange(null);
  }, []);

  const language = filePath ? getEditorLanguage(filePath) : "plaintext";

  return {
    selectionText,
    selectionRange,
    language,
    handleSelectionChange,
    clearSelection,
  };
}
