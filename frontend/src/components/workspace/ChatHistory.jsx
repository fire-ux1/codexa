import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function UserBubble({ content }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-tr-sm bg-indigo-600/25 border border-indigo-500/20 text-gray-200 text-[12px] leading-relaxed font-mono whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ content, streaming }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[90%] flex gap-2">
        {/* Avatar */}
        <div className="shrink-0 w-5 h-5 mt-0.5 rounded bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-[7px] font-black">AI</span>
        </div>
        <div className="text-gray-300 text-[12px] leading-relaxed workspace-markdown min-w-0">
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
                      fontSize: "11px",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-white/5 px-1 py-0.5 rounded text-indigo-300 font-mono text-[11px]" {...props}>
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
                return <h3 className="text-white font-bold text-[13px] mb-1 mt-3">{children}</h3>;
              },
            }}
          >
            {content}
          </ReactMarkdown>
          {streaming && (
            <span className="inline-block w-1.5 h-3.5 bg-indigo-400 rounded-sm ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const commands = ["/explain", "/review", "/test", "/docs", "/refactor", "/security"];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
        <span className="text-indigo-400 text-xl">✦</span>
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-1">AI Workspace Ready</p>
        <p className="text-gray-500 text-[11px] leading-relaxed">
          Ask anything about your codebase. Use slash commands for targeted assistance.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {commands.map((cmd) => (
          <span key={cmd} className="px-2 py-0.5 text-[10px] font-mono rounded bg-white/5 border border-white/8 text-gray-400">
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ChatHistory({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin min-h-0">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        messages.map((msg, i) =>
          msg.role === "user" ? (
            <UserBubble key={i} content={msg.content} />
          ) : (
            <AssistantBubble key={i} content={msg.content} streaming={msg.streaming} />
          )
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}
