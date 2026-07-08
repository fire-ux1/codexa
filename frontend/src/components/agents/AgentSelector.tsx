// @ts-nocheck
const AGENT_LIST = [
  { value: "auto", label: "ðŸ¤– Auto Coordinator" },
  { value: "architecture", label: "ðŸ§© Architecture Specialist" },
  { value: "security", label: "ðŸ›¡ï¸ Security Auditor" },
  { value: "performance", label: "âš¡ Performance Tuner" },
  { value: "testing", label: "ðŸ§ª Unit Testing Specialist" },
  { value: "documentation", label: "ðŸ“ Documentation Writer" },
  { value: "refactoring", label: "ðŸ§¼ Refactoring Specialist" },
  { value: "review", label: "ðŸ” Code Review Specialist" },
];

export default function AgentSelector({
  selectedAgent,
  onSelectAgent,
  collaborateMode,
  onToggleCollaboration,
  disabled,
}) {
  return (
    <div className="flex flex-col gap-3 p-3.5 bg-[#080b12] border-b border-white/5 shrink-0 select-none">
      
      {/* Dropdown selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-500">
          Selected AI Agent
        </label>
        <select
          value={selectedAgent}
          onChange={(e) => onSelectAgent && onSelectAgent(e.target.value)}
          disabled={disabled || collaborateMode}
          className="w-full bg-white/4 border border-white/8 hover:border-white/15 text-[11px] text-gray-300 font-mono rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-500/40 focus:bg-violet-500/5 transition-all disabled:opacity-50"
        >
          {AGENT_LIST.map((agent) => (
            <option key={agent.value} value={agent.value} className="bg-[#090c14] text-gray-300">
              {agent.label}
            </option>
          ))}
        </select>
      </div>

      {/* Collaboration mode toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={collaborateMode}
          onChange={(e) => onToggleCollaboration && onToggleCollaboration(e.target.checked)}
          disabled={disabled}
          className="rounded border-white/10 bg-white/3 text-violet-600 focus:ring-violet-500/30 focus:ring-offset-0 w-3.5 h-3.5 outline-none transition-all disabled:opacity-40"
        />
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-mono font-bold text-gray-300">Agent Collaboration Mode</span>
          <span className="text-[8px] font-mono text-gray-600 mt-0.5">
            Runs Architecture, Security, & Performance agents sequentially
          </span>
        </div>
      </label>

    </div>
  );
}

