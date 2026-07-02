import { useState } from "react";
import { Search, FileCode, Terminal, HelpCircle, BookOpen, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { searchCodebase, askQuestion } from "../services/api";

export default function SearchTab({
  repoPath,
  filesList = [], // All files parsed in workspace
  onOpenFile,
  onStartTrace, // Triggers tracing a symbol call graph
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  
  const [results, setResults] = useState({
    files: [],
    symbols: [],
    references: [],
    docs: [],
  });

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setAiAnswer("");
    setResults({ files: [], symbols: [], references: [], docs: [] });

    // 1. Run client-side file name filtering
    const matchedFiles = filesList.filter((f) => {
      const rel = f.path.replace(/\\/g, "/");
      return rel.toLowerCase().includes(query.toLowerCase());
    }).slice(0, 10);

    // 2. Fetch AI Answer in parallel
    setLoadingAi(true);
    askQuestion(`Answer this developer question directly for this codebase: ${query}`, repoPath)
      .then((res) => {
        if (res.answer) {
          setAiAnswer(res.answer);
        }
      })
      .catch((err) => console.error("AI Search Error:", err))
      .finally(() => setLoadingAi(false));

    // 3. Fetch Semantic Database Chunks
    try {
      const searchRes = await searchCodebase(query, repoPath);
      
      const symbolsList = [];
      const referencesList = [];
      const docsList = [];

      searchRes.forEach((item) => {
        const ext = item.file.split(".").pop().toLowerCase();
        
        if (["md", "txt", "rst", "pdf"].includes(ext)) {
          docsList.push(item);
        } else if (item.symbol) {
          symbolsList.push(item);
        } else {
          referencesList.push(item);
        }
      });

      setResults({
        files: matchedFiles,
        symbols: symbolsList.slice(0, 10),
        references: referencesList.slice(0, 10),
        docs: docsList.slice(0, 10),
      });

    } catch (err) {
      console.error("Semantic search failure:", err);
    } finally {
      setSearching(false);
    }
  };

  const hasAnyResults = 
    results.files.length > 0 || 
    results.symbols.length > 0 || 
    results.references.length > 0 || 
    results.docs.length > 0 ||
    aiAnswer;

  return (
    <div className="flex flex-col h-full bg-[#0f1219] select-text">
      {/* Header bar */}
      <div className="p-3 border-b border-[#1c2230] shrink-0">
        <span className="text-[9px] uppercase font-bold tracking-widest text-gray-500 font-mono">Universal Search</span>
      </div>

      {/* Input container */}
      <form onSubmit={handleSearchSubmit} className="p-3 border-b border-[#1c2230] shrink-0 space-y-2">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repository..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#090b10] border border-[#1c2230] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
          />
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
        </div>
      </form>

      {/* Results viewport */}
      <div className="flex-grow overflow-y-auto p-3 space-y-5 scrollbar-thin">
        {!hasAnyResults && !searching && !loadingAi && (
          <div className="py-20 text-center text-gray-600 text-xs font-mono italic space-y-1">
            <Search className="w-5 h-5 mx-auto text-gray-700 mb-2" />
            <p>Type a query above to search code.</p>
            <p className="text-[10px] opacity-75">Matches files, symbols, refs, and AI answers.</p>
          </div>
        )}

        {/* Searching Status loaders */}
        {(searching || loadingAi) && !hasAnyResults && (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <span className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></span>
            <p className="text-[10px] text-gray-500 font-mono">Querying codebase index...</p>
          </div>
        )}

        {/* AI Answer Card */}
        {(loadingAi || aiAnswer) && (
          <div className="bg-[#141822] border border-[#1c2230] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px] font-sans border-b border-[#1c2230] pb-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>AI Answer</span>
            </div>
            {loadingAi ? (
              <span className="text-[10px] text-gray-500 italic font-mono block animate-pulse">Streaming response explanation...</span>
            ) : (
              <div className="text-[11px] text-gray-300 leading-relaxed font-sans prose prose-invert prose-xs max-w-none">
                <ReactMarkdown>{aiAnswer}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Files Results */}
        {results.files.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono flex items-center gap-1">
              <FileCode className="w-3 h-3 text-emerald-500" />
              <span>Matching Files ({results.files.length})</span>
            </div>
            <div className="space-y-1">
              {results.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => onOpenFile(file.path)}
                  className="w-full text-left p-2 rounded-lg bg-[#141822] hover:bg-[#1b212f] border border-[#1c2230] transition-colors truncate block"
                >
                  <p className="text-xs text-white font-mono truncate">{file.name}</p>
                  <p className="text-[9px] text-gray-600 font-mono truncate mt-0.5">{file.path}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Symbols Results */}
        {results.symbols.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono flex items-center gap-1">
              <Terminal className="w-3 h-3 text-cyan-500" />
              <span>Code Symbols ({results.symbols.length})</span>
            </div>
            <div className="space-y-1">
              {results.symbols.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#141822] border border-[#1c2230] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-300 font-mono">{item.symbol}</span>
                    <button
                      onClick={() => onStartTrace(item.symbol)}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
                    >
                      Trace Usage
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-600 font-mono truncate">Declared in: {item.file}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code References */}
        {results.references.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>Code References ({results.references.length})</span>
            </div>
            <div className="space-y-1.5">
              {results.references.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenFile(item.path)}
                  className="p-2.5 rounded-lg bg-[#141822] hover:bg-[#1b212f] border border-[#1c2230] transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white font-mono font-bold truncate max-w-[150px]">{item.file}</span>
                    <span className="text-[9px] text-gray-600 font-mono">Score: {item.score}</span>
                  </div>
                  <pre className="p-1.5 bg-[#090b10] border border-[#1c2230] rounded-md font-mono text-[9px] text-gray-400 overflow-x-auto max-h-[80px]">
                    {item.snippet}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation matches */}
        {results.docs.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase font-bold tracking-wider text-gray-500 font-mono flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-purple-400" />
              <span>Documentation ({results.docs.length})</span>
            </div>
            <div className="space-y-1.5">
              {results.docs.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenFile(item.path)}
                  className="p-2.5 rounded-lg bg-[#141822] hover:bg-[#1b212f] border border-[#1c2230] transition-colors cursor-pointer space-y-1.5"
                >
                  <span className="text-[10px] text-white font-mono font-bold block">{item.file}</span>
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed line-clamp-3">
                    {item.snippet}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
