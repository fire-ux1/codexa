import { IconTerminal, IconSparkles } from "../icons/Icons";

export default function AssistantPanel({ question, setQuestion, isAsking, onAskQuestion }) {
  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-gray-900/40 glass">
      <div className="flex items-center gap-2 mb-3.5">
        <IconTerminal className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400">Assistant Terminal</h3>
      </div>

      <div className="space-y-4">
        <textarea
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Which endpoints process the codebase metadata?"
          className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-indigo-500/70 text-white placeholder-gray-500 focus:outline-none transition-all text-xs font-mono resize-none leading-relaxed"
        />

        <button
          onClick={() => onAskQuestion()}
          disabled={isAsking || !question.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.99]"
        >
          {isAsking ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              Streaming Answer...
            </>
          ) : (
            <>
              <IconSparkles className="w-3.5 h-3.5" />
              Run Streaming Query
            </>
          )}
        </button>
      </div>
    </div>
  );
}
