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
        <h2 className="text-xs font-semibold text-text-strong flex items-center gap-2 font-sans">
          <IconNetwork className="w-4 h-4 text-accent" /> Interactive Dependency Call Graph
        </h2>
        <p className="mt-1 text-[11px] text-muted leading-relaxed font-sans">
          Trace functional hierarchies. Select defined classes and methods to view callers and outbound dependency calls.
        </p>
      </div>

      {error ? (
        <div className="py-16 text-center text-rose-400 space-y-4 max-w-md mx-auto bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 w-full font-sans">
          <IconNetwork className="w-12 h-12 mx-auto text-rose-400 opacity-60 animate-pulse" />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider font-mono">Analysis Failed</p>
            <p className="text-[11px] text-gray-400 font-mono bg-bg px-3 py-2 rounded-lg border border-border max-h-[80px] overflow-y-auto text-left break-all select-all scrollbar-thin">
              {error}
            </p>
          </div>
          <button
            onClick={onGetCallGraph}
            disabled={isGraphLoading}
            className="px-5 py-2 text-xs font-bold bg-[#FF9D4D] text-[#0A0D12] hover:bg-[#FFB073] rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer font-sans shadow-md"
          >
            {isGraphLoading ? "Retrying Mappings..." : "Retry Mapping Code"}
          </button>
        </div>
      ) : !callGraph ? (
        <div className="py-24 text-center text-muted border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 bg-panel/30 max-w-lg mx-auto w-full px-6 select-none font-sans">
          <div className="w-12 h-12 rounded-full bg-accent-dim/10 flex items-center justify-center text-accent">
            <IconNetwork className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[13px] font-semibold text-text-strong">Call Graph Unmapped</h3>
            <p className="text-[11px] text-muted max-w-xs mx-auto leading-relaxed">
              Analyze the codebase symbol definitions to index caller relationships and track functional hierarchies.
            </p>
          </div>
          <button
            onClick={onGetCallGraph}
            disabled={isGraphLoading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
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
                className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-xl text-[11px] font-sans text-text-strong placeholder-muted focus:outline-none focus:border-accent shadow-inner"
              />
            </div>

            <div className="max-h-[380px] overflow-y-auto border border-border rounded-xl bg-panel divide-y divide-border scrollbar-thin">
              {filteredFunctions.length === 0 ? (
                <p className="p-4 text-[11px] text-muted text-center font-sans">No matching symbols</p>
              ) : (
                filteredFunctions.map((func) => {
                  const parsed = parseSymbolLabel(func);
                  const isSelected = selectedFunc === func;
                  return (
                    <button
                      key={func}
                      onClick={() => setSelectedFunc(func)}
                      className={`w-full p-3 text-left transition-all text-[11px] font-sans block ${
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
            <div className="space-y-6 font-sans">
              {/* Selected node banner */}
              <div className="p-4.5 rounded-2xl bg-secondary-dim/10 border border-secondary/25 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 blur-xl pointer-events-none" />
                <span className="text-[11px] font-medium text-secondary">
                  Selected Symbol
                </span>
                <h3 className="text-[14px] font-bold text-text-strong font-mono truncate mt-1">
                  {parseSymbolLabel(selectedFunc).name}
                </h3>
                <p className="text-[11px] text-muted truncate mt-0.5">
                  Defined in: <span className="font-mono text-[10px]">{parseSymbolLabel(selectedFunc).file || "Repository root"}</span>
                </p>
              </div>

              {/* Call directions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Incoming calls */}
                <div className="p-5 rounded-2xl border border-border bg-panel shadow-md min-h-[200px] flex flex-col">
                  <span className="text-[11px] font-medium text-violet-400 block mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 glowing-dot" />
                    Callers (Incoming)
                  </span>
                  <div className="flex-grow space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                    {functionCallers.length === 0 ? (
                      <p className="text-[11px] text-muted italic pt-8 text-center">
                        No incoming calls detected.
                      </p>
                    ) : (
                      functionCallers.map((caller) => (
                        <button
                          key={caller}
                          onClick={() => setSelectedFunc(caller)}
                          className="w-full p-2 rounded-xl bg-panel-alt border border-border text-left text-[11px] font-sans text-text hover:text-text-strong hover:border-accent/30 hover:bg-panel-alt-2 transition-all block truncate cursor-pointer"
                        >
                          <span className="font-mono">{parseSymbolLabel(caller).name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Outgoing calls */}
                <div className="p-5 rounded-2xl border border-border bg-panel shadow-md min-h-[200px] flex flex-col">
                  <span className="text-[11px] font-medium text-success block mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success glowing-dot" />
                    Callees (Outgoing)
                  </span>
                  <div className="flex-grow space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                    {!callGraph[selectedFunc] || callGraph[selectedFunc].length === 0 ? (
                      <p className="text-[11px] text-muted italic pt-8 text-center">
                        Calls no internal functions.
                      </p>
                    ) : (
                      callGraph[selectedFunc].map((callee) => (
                        <button
                          key={callee}
                          onClick={() => setSelectedFunc(callee)}
                          className="w-full p-2 rounded-xl bg-panel-alt border border-border text-left text-[11px] font-sans text-text hover:text-text-strong hover:border-accent/30 hover:bg-panel-alt-2 transition-all block truncate cursor-pointer"
                        >
                          <span className="font-mono">{parseSymbolLabel(callee).name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-muted border border-dashed border-border rounded-2xl bg-panel/30 font-sans">
              <p className="text-[11px]">Select a function symbol from the sidebar to inspect dependencies.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
