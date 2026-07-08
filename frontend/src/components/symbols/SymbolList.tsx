interface SymbolItem {
  kind: string;
  name: string;
  line: number;
  [key: string]: any;
}

interface SymbolListProps {
  symbols: SymbolItem[];
  onSelectSymbol: (sym: SymbolItem) => void;
}

export default function SymbolList({ symbols, onSelectSymbol }: SymbolListProps) {
  const getKindBadge = (kind: string) => {
    const k = kind.toLowerCase();
    if (k === "class") {
      return (
        <span className="w-5 h-5 flex items-center justify-center text-[9px] font-bold rounded bg-accent-dim/20 text-accent border border-accent/30 shrink-0">
          C
        </span>
      );
    }
    if (k === "function" || k === "asyncfunctiondef" || k === "functiondef") {
      return (
        <span className="w-5 h-5 flex items-center justify-center text-[9px] font-bold rounded bg-success-bg/20 text-success border border-success/30 shrink-0">
          F
        </span>
      );
    }
    return (
      <span className="w-5 h-5 flex items-center justify-center text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
        M
      </span>
    );
  };

  return (
    <div className="space-y-1">
      {symbols.map((sym, index) => (
        <button
          key={index}
          onClick={() => onSelectSymbol(sym)}
          className="w-full text-left flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-panel-alt transition-all text-xs font-mono text-text hover:text-text-strong cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            {getKindBadge(sym.kind)}
            <span className="truncate">{sym.name}</span>
          </div>
          <span className="text-[10px] text-muted select-none shrink-0 font-sans">
            ln {sym.line}
          </span>
        </button>
      ))}
    </div>
  );
}
