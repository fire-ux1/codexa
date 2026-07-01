// Parse symbols in "filename.py::funcname" format
export const parseSymbolLabel = (symbolStr) => {
  if (!symbolStr) return { file: "", name: "" };
  if (!symbolStr.includes("::")) return { file: "", name: symbolStr };
  const [file, name] = symbolStr.split("::");
  return { file, name };
};
