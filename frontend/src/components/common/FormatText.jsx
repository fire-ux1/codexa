// Lightweight markdown-like text renderer

export function parseInlineCode(str) {
  const parts = [];
  const regex = /`([^`]+)`/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    parts.push(
      <code key={match.index} className="bg-black/40 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[13px] border border-white/5">
        {match[1]}
      </code>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts.length > 0 ? parts : str;
}

export default function FormatText({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (line.trim().startsWith("```")) {
          return null;
        }

        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          const content = line.trim().substring(2);
          return (
            <ul key={idx} className="list-disc pl-5 text-gray-300">
              <li>{parseInlineCode(content)}</li>
            </ul>
          );
        }

        if (line.trim().startsWith("### ")) {
          return (
            <h3 key={idx} className="text-md font-semibold text-indigo-400 mt-4">
              {line.trim().substring(4)}
            </h3>
          );
        }

        if (line.trim().startsWith("## ")) {
          return (
            <h2 key={idx} className="text-lg font-bold text-violet-300 mt-5 border-b border-white/5 pb-1">
              {line.trim().substring(3)}
            </h2>
          );
        }

        const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 text-gray-300 pl-2">
              <span className="text-indigo-400 font-semibold">{numMatch[1]}.</span>
              <div>{parseInlineCode(numMatch[2])}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-gray-300 leading-relaxed text-[14px]">
            {parseInlineCode(line)}
          </p>
        );
      })}
    </div>
  );
}
