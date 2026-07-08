// @ts-nocheck
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function AgentResponse({ content, isStreaming, agentName }) {
  if (!content && isStreaming) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/5 border border-violet-500/10">
        <span className="w-3 h-3 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin shrink-0" />
        <span className="text-[10px] text-violet-400 font-mono">Agent analyzing...</span>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-full flex gap-2">
        {/* Avatar */}
        <div className="shrink-0 w-5 h-5 mt-0.5 rounded bg-violet-600 flex items-center justify-center select-none">
          <span className="text-white text-[7px] font-black uppercase">
            {agentName ? agentName.substring(0, 2) : "AG"}
          </span>
        </div>
        <div className="text-gray-300 text-[11px] leading-relaxed workspace-markdown min-w-0 flex-1">
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: "8px 0",
                      borderRadius: "8px",
                      fontSize: "10px",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-white/5 px-1 py-0.5 rounded text-violet-300 font-mono text-[10px]" {...props}>
                    {children}
                  </code>
                );
              },
              p({ children }) {
                return <p className="mb-2 last:mb-0 text-gray-300">{children}</p>;
              },
              strong({ children }) {
                return <strong className="text-white font-semibold">{children}</strong>;
              },
              ul({ children }) {
                return <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>;
              },
              li({ children }) {
                return <li className="text-gray-300">{children}</li>;
              },
              h3({ children }) {
                return <h3 className="text-white font-bold text-[12px] mb-1 mt-3">{children}</h3>;
              },
              h4({ children }) {
                return <h4 className="text-violet-400 font-bold text-[11px] mb-1 mt-3 uppercase tracking-wider">{children}</h4>;
              },
            }}
          >
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-1.5 h-3.5 bg-violet-400 rounded-sm ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

