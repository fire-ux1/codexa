// Helper to determine node colors
export const getFileColor = (ext) => {
  switch (ext) {
    case ".py":
      return "#3572A5";
    case ".js":
    case ".jsx":
      return "#f1e05a";
    case ".ts":
    case ".tsx":
      return "#3178c6";
    case ".html":
      return "#e34c26";
    case ".css":
      return "#563d7c";
    case ".json":
      return "#007acc";
    default:
      return "#6b7280";
  }
};
