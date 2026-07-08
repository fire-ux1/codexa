interface BranchSelectorProps {
  branches: string[];
  selected: string | null;
  onChange: (branch: string) => void;
  label?: string;
}

export default function BranchSelector({
  branches = [],
  selected,
  onChange,
  label = "Select Branch",
}: BranchSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted select-none">
        {label}
      </label>
      <select
        value={selected || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="bg-bg border border-border hover:border-accent/40 text-[11px] text-text-strong font-mono rounded-lg px-2.5 py-1.5 outline-none focus:border-accent/60 focus:bg-accent-dim/10 transition-all select-none cursor-pointer"
      >
        {branches.length === 0 ? (
          <option value="" disabled className="bg-panel text-muted">
            No branches found
          </option>
        ) : (
          branches.map((branch) => (
            <option key={branch} value={branch} className="bg-panel text-text">
              {branch}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
