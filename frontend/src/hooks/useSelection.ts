import { useState, useCallback } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { getEditorLanguage } from "../utils/editorLanguage";

export interface SelectionRange {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface UseSelectionResult {
  selectionText: string;
  selectionRange: SelectionRange | null;
  language: string;
  handleSelectionChange: (editor: MonacoEditor.IStandaloneCodeEditor) => void;
  clearSelection: () => void;
}

export default function useSelection(filePath: string | null): UseSelectionResult {
  const [selectionText, setSelectionText] = useState<string>("");
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);

  const handleSelectionChange = useCallback(
    (editor: MonacoEditor.IStandaloneCodeEditor) => {
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
          startColumn: selection.startColumn,
          endColumn: selection.endColumn,
        });
      } else {
        setSelectionText("");
        setSelectionRange(null);
      }
    },
    []
  );

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