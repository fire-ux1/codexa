// @ts-nocheck
import { useState, useRef, useCallback } from "react";
import AgentSelector from "./AgentSelector";
import AgentResponse from "./AgentResponse";
import AgentHistory from "./AgentHistory";
import { runAgentChatStream } from "../../services/agents";

export default function AgentChat({
  repoPath,
  activeFile,
  activeSymbol,
  selectionText,
}) {
  const [agent, setAgent] = useState("auto");
  const [collaborateMode, setCollaborateMode] = useState(false);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState([]); // Array of { role, content, agent }
  const [inputText, setInputText] = useState("");
  
  // History of reports
  const [reportHistory, setReportHistory] = useState([]);
  const streamAbortRef = useRef(null);

  const handleStop = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    setIsStreaming(false);
  }, []);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query || isStreaming) return;

    setInputText("");
    setIsStreaming(true);

    const userMessage = { role: "user", content: query, agent: "user" };
    const assistantMessage = { role: "assistant", content: "", agent, streaming: true };
    setMessages([userMessage, assistantMessage]);

    // Create payload
    const payload = {
      message: query,
      agent_type: agent,
      collaborate: collaborateMode,
      repo: repoPath,
      file: activeFile,
      symbol: activeSymbol,
      selection: selectionText || null,
    };

    let accumulatedResponse = "";
    
    try {
      const controller = new AbortController();
      streamAbortRef.current = controller;

      const response = await runAgentChatStream({
        ...payload,
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep trailing incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === "token" && parsed.token) {
              accumulatedResponse += parsed.token;
              setMessages([
                userMessage,
                { role: "assistant", content: accumulatedResponse, agent, streaming: true }
              ]);
            }
          } catch {
            // ignore partial lines
          }
        }
      }

      // Finalize message state
      setMessages([
        userMessage,
        { role: "assistant", content: accumulatedResponse, agent, streaming: false }
      ]);

      // Archive report in history
      setReportHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          message: query,
          agent_type: agent,
          collaborate: collaborateMode,
          response: accumulatedResponse,
        }
      ]);

    } catch (err) {
      if (err.name === "AbortError") {
        setMessages([
          userMessage,
          { role: "assistant", content: accumulatedResponse + "\n\n*(Stopped)*", agent, streaming: false }
        ]);
      } else {
        setMessages([
          userMessage,
          { role: "assistant", content: `Error: ${err.message}`, agent, streaming: false }
        ]);
      }
    } finally {
      setIsStreaming(false);
      streamAbortRef.current = null;
    }
  };

  const handleSelectHistory = (entry) => {
    // Restore historical session messages
    setAgent(entry.agent_type);
    setCollaborateMode(entry.collaborate);
    setMessages([
      { role: "user", content: entry.message, agent: "user" },
      { role: "assistant", content: entry.response, agent: entry.agent_type, streaming: false }
    ]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#07090f]">
      {/* Selector dropdown and toggles */}
      <AgentSelector
        selectedAgent={agent}
        onSelectAgent={setAgent}
        collaborateMode={collaborateMode}
        onToggleCollaboration={setCollaborateMode}
        disabled={isStreaming}
      />

      {/* Main chat messages log */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3.5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-6 select-none">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              <span className="text-violet-400 text-lg">🤖</span>
            </div>
            <div>
              <p className="text-white font-semibold text-xs mb-1">AI Agents Coordinator</p>
              <p className="text-muted text-[10px] leading-relaxed">
                Select a specialized auditor or coordinate them sequentially. Ask questions targeting your active file context.
              </p>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx}>
              {m.role === "user" ? (
                <div className="flex justify-end mb-4">
                  <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-tr-sm bg-violet-600/20 border border-violet-500/20 text-gray-200 text-[11px] leading-relaxed font-mono whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ) : (
                <AgentResponse
                  content={m.content}
                  isStreaming={m.streaming}
                  agentName={m.agent}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* History slider popup (collapsible or bottom docked) */}
      {reportHistory.length > 0 && messages.length === 0 && (
        <div className="h-[200px] border-t border-white/5 bg-[#080b12] shrink-0">
          <AgentHistory history={reportHistory} onSelect={handleSelectHistory} />
        </div>
      )}

      {/* Input box */}
      <form onSubmit={handleSend} className="p-3 bg-[#080b12] border-t border-white/5 shrink-0 select-none">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isStreaming}
            placeholder={
              collaborateMode
                ? "Run Collaboration review on active file..."
                : `Ask the ${agent.capitalize()} Agent a question...`
            }
            className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-[11px] text-gray-300 placeholder-gray-600 font-mono outline-none focus:border-violet-500/40 focus:bg-violet-500/5 transition-all disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-3.5 py-2 text-[10px] font-mono font-bold rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/30 transition-all shrink-0"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-3.5 py-2 text-[10px] font-mono font-bold rounded-lg bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
            >
              Ask
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// Simple capitalize helper
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

