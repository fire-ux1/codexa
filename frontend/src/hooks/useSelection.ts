import { useState, useCallback } from "react";
import { getEditorLanguage } from "../utils/editorLanguage";

export interface SelectionRange {
  startLine: number;
  endLine: number;
}

export default function useSelection(filePath: string | null) {
  const [selectionText, setSelectionText] = useState<string>("");
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);

  const handleSelectionChange = useCallback((editor: any) => {
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
