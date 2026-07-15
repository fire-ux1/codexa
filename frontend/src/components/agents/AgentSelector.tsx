// @ts-nocheck
const AGENT_LIST = [
  { value: "auto", label: "🤖 Auto Coordinator" },
  { value: "architecture", label: "🧩 Architecture Specialist" },
  { value: "security", label: "🛡️ Security Auditor" },
  { value: "performance", label: "⚡ Performance Tuner" },
  { value: "testing", label: "🧪 Unit Testing Specialist" },
  { value: "documentation", label: "📝 Documentation Writer" },
  { value: "refactoring", label: "🧼 Refactoring Specialist" },
  { value: "review", label: "🔍 Code Review Specialist" },
];

export default function AgentSelector({
  selectedAgent,
  onSelectAgent,
  collaborateMode,
  onToggleCollaboration,
  disabled,
}) {
  return (
    <div className="flex flex-col gap-3 p-3.5 bg-panel border-b border-border shrink-0 select-none">
      
      {/* Dropdown selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-muted">
          Selected AI Agent
        </label>
        <select
          value={selectedAgent}
          onChange={(e) => onSelectAgent && onSelectAgent(e.target.value)}
          disabled={disabled || collaborateMode}
          className="w-full bg-bg border border-border hover:border-border-strong text-[12px] text-text rounded-lg px-2.5 py-1.5 outline-none focus:border-accent/40 focus:bg-panel-alt transition-all disabled:opacity-50"
        >
          {AGENT_LIST.map((agent) => (
            <option key={agent.value} value={agent.value} className="bg-panel text-text">
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
          className="rounded border-border bg-bg text-accent focus:ring-accent/30 focus:ring-offset-0 w-3.5 h-3.5 outline-none transition-all disabled:opacity-40"
        />
        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-medium text-text-strong">Agent Collaboration Mode</span>
          <span className="text-[9px] text-muted mt-0.5">
            Runs Architecture, Security, & Performance agents sequentially
          </span>
        </div>
      </label>

    </div>
  );
}

