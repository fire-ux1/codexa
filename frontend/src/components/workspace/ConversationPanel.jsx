import { useCallback } from "react";
import ChatHistory from "./ChatHistory";
import ContextPanel from "./ContextPanel";
import PromptBox from "./PromptBox";

export default function ConversationPanel({
  repoPath,
  activeFile,
  activeSymbol,
  selectionText,
  selectionRange,
  language,
  conversationId,
  messages,
  isStreaming,
  onSendMessage,
  onStop,
  onNewConversation,
}) {
  const handleSubmit = useCallback(
    (message) => {
      onSendMessage({
        repo: repoPath,
        file: activeFile,
        symbol: activeSymbol,
        selection: selectionText,
        message,
      });
    },
    [repoPath, activeFile, activeSymbol, selectionText, onSendMessage]
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center gap-2 px-3 h-9 border-b border-white/5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-widest">AI Workspace</span>
          <div className="ml-auto flex items-center gap-1.5">
            {/* New conversation */}
            <button
              onClick={onNewConversation}
              title="New Conversation"
              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold text-gray-500 hover:text-indigo-400 hover:bg-indigo-600/10 rounded transition-all uppercase tracking-wider"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>

        {/* Messages */}
        <ChatHistory messages={messages} />

        {/* Input */}
        <PromptBox
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
          onStop={onStop}
          hasSelection={!!selectionText}
          selectionRange={selectionRange}
        />
      </div>

      {/* Narrow context sidebar */}
      <div className="w-44 shrink-0 hidden xl:block">
        <ContextPanel
          repoPath={repoPath}
          activeFile={activeFile}
          activeSymbol={activeSymbol}
          selectionRange={selectionRange}
          language={language}
          conversationId={conversationId}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
