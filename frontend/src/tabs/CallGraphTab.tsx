import { IconNetwork, IconSearch } from "../components/icons/Icons";

interface SymbolLabel {
  file: string;
  name: string;
}

function parseSymbolLabel(symbolStr: string): SymbolLabel {
  if (!symbolStr.includes("::")) return { file: "", name: symbolStr };
  const [file, name] = symbolStr.split("::");
  return { file, name };
}

interface CallGraphTabProps {
  callGraph: Record<string, string[]> | null | undefined;
  graphSearch: string;
  setGraphSearch: (search: string) => void;
  selectedFunc: string | null;
  setSelectedFunc: (func: string) => void;
  filteredFunctions: string[];
  functionCallers: string[];
  isGraphLoading: boolean;
  onGetCallGraph: () => void;
  error?: string | null;
}

export default function CallGraphTab({
  callGraph,
  graphSearch,
  setGraphSearch,
  selectedFunc,
  setSelectedFunc,
  filteredFunctions,
  functionCallers,
  isGraphLoading,
  onGetCallGraph,
  error,
}: CallGraphTabProps) {
  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Header bar */}
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-text-strong flex items-center gap-2 font-display">
          <IconNetwork className="w-5 h-5 text-accent" /> Interactive Dependency Call Graph
        </h2>
        <p className="mt-1 text-xs text-soft leading-relaxed font-body">
          Trace functional hierarchies. Select defined classes and methods to view callers and outbound dependency calls.
        </p>
      </div>

      {error ? (
        <div className="py-16 text-center text-rose-400 space-y-4 max-w-md mx-auto bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 glass">
          <IconNetwork className="w-12 h-12 mx-auto text-rose-400 opacity-60 animate-pulse" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold uppercase tracking-wider font-mono">Analysis Failed</p>
            <p className="text-xs text-gray-400 font-mono bg-[#0A0D12]/60 px-3 py-2 rounded-lg border border-[#222834] max-h-[80px] overflow-y-auto text-left break-all select-all scrollbar-thin">
              {error}
            </p>
          </div>
          <button
            onClick={onGetCallGraph}
            disabled={isGraphLoading}
            className="px-5 py-2.5 text-xs font-semibold bg-[#FF9D4D] text-[#0A0D12] hover:bg-[#FFB073] rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-mono shadow-md"
          >
            {isGraphLoading ? "Retrying Mappings..." : "Retry Mapping Code"}
          </button>
        </div>
      ) : !callGraph ? (
        <div className="py-24 text-center text-muted space-y-4">
          <IconNetwork className="w-12 h-12 mx-auto text-muted opacity-40 animate-pulse" />
          <p className="text-sm font-body">Call graph mappings not calculated yet.</p>
          <button
            onClick={onGetCallGraph}
            disabled={isGraphLoading}
            className="px-5 py-3 text-xs font-semibold bg-accent text-bg hover:bg-accent-strong rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-mono shadow-md"
          >
            {isGraphLoading ? "Mapping Code..." : "Map Code Call Mappings"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
          
          {/* Symbols Search & Sidebar List */}
          <div className="space-y-3.5">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                <IconSearch className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={graphSearch}
                onChange={(e) => setGraphSearch(e.target.value)}
                placeholder="Search functions..."
                className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-xl text-xs font-mono text-text-strong placeholder-muted focus:outline-none focus:border-accent shadow-inner"
              />
            </div>

            <div className="max-h-[380px] overflow-y-auto border border-border rounded-xl bg-panel divide-y divide-border scrollbar-thin">
              {filteredFunctions.length === 0 ? (
                <p className="p-4 text-xs text-muted text-center font-mono">No matching symbols</p>
              ) : (
                filteredFunctions.map((func) => {
                  const parsed = parseSymbolLabel(func);
                  const isSelected = selectedFunc === func;
                  return (
                    <button
                      key={func}
                      onClick={() => setSelectedFunc(func)}
                      className={`w-full p-3 text-left transition-all text-xs font-mono block ${
                        isSelected
                          ? "bg-accent text-bg font-semibold"
                          : "text-text hover:text-text-strong hover:bg-panel-alt-2"
                      }`}
                    >
                      <div className="truncate font-semibold">{parsed.name}</div>
                      {parsed.file && (
                        <div
                          className={`truncate text-[9px] mt-0.5 ${
                            isSelected ? "text-bg/85 font-normal" : "text-muted"
                          }`}
                        >
                          {parsed.file}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Callers/Callees Detail Dashboard */}
          {selectedFunc ? (
            <div className="space-y-6">
              {/* Selected node banner */}
              <div className="p-4.5 rounded-2xl bg-secondary-dim/10 border border-secondary/25 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 blur-xl pointer-events-none" />
                <span className="text-[10px] uppercase font-bold text-secondary tracking-wider font-mono">
                  Selected Symbol
                </span>
                <h3 className="text-base font-bold text-text-strong font-mono truncate mt-1">
                  {parseSymbolLabel(selectedFunc).name}
                </h3>
                <p className="text-[10px] text-muted font-mono truncate mt-0.5">
                  Defined in: {parseSymbolLabel(selectedFunc).file || "Repository root"}
                </p>
              </div>

              {/* Call directions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Incoming calls */}
                <div className="p-5 rounded-2xl border border-border bg-panel shadow-md min-h-[200px] flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-violet tracking-wider block mb-3 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet glowing-dot" />
                    Callers (Incoming)
                  </span>
                  <div className="flex-grow space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                    {functionCallers.length === 0 ? (
                      <p className="text-xs text-muted italic font-mono pt-8 text-center">
                        No incoming calls detected.
                      </p>
                    ) : (
                      functionCallers.map((caller) => (
                        <button
                          key={caller}
                          onClick={() => setSelectedFunc(caller)}
                          className="w-full p-2.5 rounded-xl bg-panel-alt border border-border text-left text-xs font-mono text-text hover:text-text-strong hover:border-accent/30 hover:bg-panel-alt-2 transition-all block truncate"
                        >
                          {parseSymbolLabel(caller).name}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Outgoing calls */}
                <div className="p-5 rounded-2xl border border-border bg-panel shadow-md min-h-[200px] flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-success tracking-wider block mb-3 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success glowing-dot" />
                    Callees (Outgoing)
                  </span>
                  <div className="flex-grow space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                    {!callGraph[selectedFunc] || callGraph[selectedFunc].length === 0 ? (
                      <p className="text-xs text-muted italic font-mono pt-8 text-center">
                        Calls no internal functions.
                      </p>
                    ) : (
                      callGraph[selectedFunc].map((callee) => (
                        <button
                          key={callee}
                          onClick={() => setSelectedFunc(callee)}
                          className="w-full p-2.5 rounded-xl bg-panel-alt border border-border text-left text-xs font-mono text-text hover:text-text-strong hover:border-accent/30 hover:bg-panel-alt-2 transition-all block truncate"
                        >
                          {parseSymbolLabel(callee).name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-muted border border-dashed border-border rounded-2xl">
              <p className="text-xs font-mono">Select a function symbol from the sidebar to inspect dependencies.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
