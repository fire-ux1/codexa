import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageItem {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-tr-sm bg-accent-dim/25 border border-accent/20 text-text text-[12px] leading-relaxed font-mono whitespace-pre-wrap select-text">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[90%] flex gap-2">
        {/* Avatar */}
        <div className="shrink-0 w-5 h-5 mt-0.5 rounded bg-accent flex items-center justify-center glowing-dot shadow-sm shadow-accent/30">
          <span className="text-bg text-[7px] font-black">AI</span>
        </div>
        <div className="text-text text-[12px] leading-relaxed workspace-markdown min-w-0 select-text">
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }: any) {
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
                  <code className="bg-panel-alt px-1 py-0.5 rounded text-accent font-mono text-[11px] border border-border" {...props}>
                    {children}
                  </code>
                );
              },
              p({ children }: any) {
                return <p className="mb-2 last:mb-0 text-text">{children}</p>;
              },
              strong({ children }: any) {
                return <strong className="text-text-strong font-semibold">{children}</strong>;
              },
              ul({ children }: any) {
                return <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>;
              },
              li({ children }: any) {
                return <li className="text-text">{children}</li>;
              },
              h3({ children }: any) {
                return <h3 className="text-text-strong font-bold text-[13px] mb-1 mt-3">{children}</h3>;
              },
            }}
          >
            {content}
          </ReactMarkdown>
          {streaming && (
            <span className="inline-block w-1.5 h-3.5 bg-accent rounded-sm ml-0.5 animate-pulse glowing-dot" />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatEmptyState() {
  const commands = ["/explain", "/review", "/test", "/docs", "/refactor", "/security"];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center select-none">
      <div className="w-12 h-12 rounded-2xl bg-accent-dim/20 border border-accent/20 flex items-center justify-center">
        <span className="text-accent text-xl">✦</span>
      </div>
      <div>
        <p className="text-text-strong font-semibold text-sm mb-1">AI Workspace Ready</p>
        <p className="text-muted text-[11px] leading-relaxed">
          Ask anything about your codebase. Use slash commands for targeted assistance.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {commands.map((cmd) => (
          <span key={cmd} className="px-2 py-0.5 text-[10px] font-mono rounded bg-panel border border-border text-muted">
            {cmd}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ChatHistoryProps {
  messages: MessageItem[];
}

export default function ChatHistory({ messages }: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin min-h-0 bg-bg">
      {messages.length === 0 ? (
        <ChatEmptyState />
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
