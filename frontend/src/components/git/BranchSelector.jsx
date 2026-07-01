export default function BranchSelector({
  branches = [],
  selected,
  onChange,
  label = "Select Branch",
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-500">
        {label}
      </label>
      <select
        value={selected || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="bg-white/4 border border-white/8 hover:border-white/15 text-[11px] text-gray-300 font-mono rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-500/40 focus:bg-violet-500/5 transition-all select-none"
      >
        {branches.length === 0 ? (
          <option value="" disabled className="bg-[#090c14] text-gray-600">
            No branches found
          </option>
        ) : (
          branches.map((branch) => (
            <option key={branch} value={branch} className="bg-[#090c14] text-gray-300">
              {branch}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
