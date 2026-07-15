import React, { useState } from "react";
import { Search, FileCode, Terminal, HelpCircle, BookOpen, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { searchCodebase, askQuestion } from "../services/api";

export interface FileItem {
  name: string;
  path: string;
  [key: string]: any;
}

export interface SearchResultItem {
  file: string;
  path: string;
  symbol?: string;
  snippet?: string;
  score?: number | string;
  [key: string]: any;
}

interface SearchResults {
  files: FileItem[];
  symbols: SearchResultItem[];
  references: SearchResultItem[];
  docs: SearchResultItem[];
}

interface SearchTabProps {
  repoPath: string;
  filesList: FileItem[];
  onOpenFile: (path: string) => void;
  onStartTrace: (symbol: string) => void;
}

export default function SearchTab({
  repoPath,
  filesList = [],
  onOpenFile,
  onStartTrace,
}: SearchTabProps) {
  const [query, setQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  
  const [results, setResults] = useState<SearchResults>({
    files: [],
    symbols: [],
    references: [],
    docs: [],
  });

  const handleSearchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      .then((res: any) => {
        if (res.answer) {
          setAiAnswer(res.answer);
        }
      })
      .catch((err) => console.error("AI Search Error:", err))
      .finally(() => setLoadingAi(false));

    // 3. Fetch Semantic Database Chunks
    try {
      const searchRes = await searchCodebase(query, repoPath);
      
      const symbolsList: SearchResultItem[] = [];
      const referencesList: SearchResultItem[] = [];
      const docsList: SearchResultItem[] = [];

      (searchRes as any[]).forEach((item) => {
        const ext = item.file.split(".").pop()?.toLowerCase() || "";
        const resultItem: SearchResultItem = {
          file: item.file,
          path: item.path || item.file,
          symbol: item.symbol,
          snippet: item.snippet,
          score: item.score,
          line: item.line,
        };
        
        if (["md", "txt", "rst", "pdf"].includes(ext)) {
          docsList.push(resultItem);
        } else if (item.symbol) {
          symbolsList.push(resultItem);
        } else {
          referencesList.push(resultItem);
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
    <div className="flex flex-col h-full bg-panel select-text">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-border bg-panel-alt-2/40 shrink-0">
        <span className="text-[10px] uppercase font-bold tracking-widest text-muted font-mono">
          Universal Search
        </span>
      </div>

      {/* Input container */}
      <form onSubmit={handleSearchSubmit} className="p-4 border-b border-border bg-panel/20 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repository files, symbols, code snippets..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg border border-border text-xs text-text-strong placeholder-muted focus:outline-none focus:border-accent transition-all font-mono shadow-inner"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
        </div>
      </form>

      {/* Results viewport */}
      <div className="flex-grow overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {!hasAnyResults && !searching && !loadingAi && (
          <div className="py-24 text-center text-muted text-xs font-mono space-y-2">
            <Search className="w-8 h-8 mx-auto text-muted opacity-40 mb-2 animate-pulse" />
            <p className="font-body">Type a query above to search code.</p>
            <p className="text-[10px] opacity-60">Matches file paths, declared symbols, references, and AI explanations.</p>
          </div>
        )}

        {/* Searching Status loaders */}
        {(searching || loadingAi) && !hasAnyResults && (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <span className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></span>
            <p className="text-[10px] text-soft font-mono">Querying codebase index...</p>
          </div>
        )}

        {/* AI Answer Card */}
        {(loadingAi || aiAnswer) && (
          <div className="glass border border-border/80 rounded-2xl p-4.5 space-y-3 shadow-md relative overflow-hidden">
            {/* Soft inner glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-accent/5 to-secondary/5 blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-2 text-accent font-semibold text-xs font-display border-b border-border pb-2 relative z-10">
              <HelpCircle className="w-4 h-4 text-accent animate-pulse" />
              <span>AI Summary & Answer</span>
            </div>
            
            <div className="relative z-10">
              {loadingAi ? (
                <span className="text-[11px] text-muted italic font-mono block animate-pulse">
                  Streaming codebase response...
                </span>
              ) : (
                <div className="text-xs text-text leading-relaxed font-body prose prose-invert prose-xs max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:text-text-strong prose-headings:mt-3 prose-headings:mb-1.5">
                  <ReactMarkdown>{aiAnswer}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Files Results */}
        {results.files.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted font-mono flex items-center gap-2 mb-1.5 pb-1 border-b border-border/40">
              <FileCode className="w-3.5 h-3.5 text-success" />
              <span>Matching Files ({results.files.length})</span>
            </div>
            <div className="space-y-1.5">
              {results.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => onOpenFile(file.path)}
                  className="w-full text-left p-3 rounded-xl bg-panel-alt hover:bg-panel-alt-2 border border-border hover:border-accent/40 transition-all cursor-pointer block glass-hover"
                >
                  <p className="text-xs font-bold text-text-strong font-mono truncate">{file.name}</p>
                  <p className="text-[9px] text-muted font-mono truncate mt-1">{file.path}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Symbols Results */}
        {results.symbols.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted font-mono flex items-center gap-2 mb-1.5 pb-1 border-b border-border/40">
              <Terminal className="w-3.5 h-3.5 text-secondary" />
              <span>Code Symbols ({results.symbols.length})</span>
            </div>
            <div className="space-y-2">
              {results.symbols.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-panel-alt border border-border hover:border-accent/40 space-y-2 shadow-sm glass-hover"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-secondary font-mono">{item.symbol}</span>
                    <button
                      onClick={() => onStartTrace(item.symbol || "")}
                      className="text-[10px] text-accent hover:text-accent-strong hover:underline font-semibold font-mono"
                    >
                      Trace Usage
                    </button>
                  </div>
                  <p className="text-[9px] text-muted font-mono truncate">Declared in: {item.file}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code References */}
        {results.references.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted font-mono flex items-center gap-2 mb-1.5 pb-1 border-b border-border/40">
              <AlertCircle className="w-3.5 h-3.5 text-accent" />
              <span>Code References ({results.references.length})</span>
            </div>
            <div className="space-y-2">
              {results.references.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenFile(item.path)}
                  className="p-3.5 rounded-xl bg-panel-alt hover:bg-panel-alt-2 border border-border hover:border-accent/40 transition-all cursor-pointer space-y-2.5 shadow-sm glass-hover"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-strong font-mono font-bold truncate max-w-[180px]">
                      {item.file}
                    </span>
                    <span className="text-[9px] text-muted font-mono">Score: {item.score}</span>
                  </div>
                  <pre className="p-2.5 bg-bg border border-border rounded-lg font-mono text-[10px] text-text/80 overflow-x-auto max-h-[100px]">
                    {item.snippet}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation matches */}
        {results.docs.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted font-mono flex items-center gap-2 mb-1.5 pb-1 border-b border-border/40">
              <BookOpen className="w-3.5 h-3.5 text-violet" />
              <span>Documentation ({results.docs.length})</span>
            </div>
            <div className="space-y-2">
              {results.docs.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenFile(item.path)}
                  className="p-3.5 rounded-xl bg-panel-alt hover:bg-panel-alt-2 border border-border hover:border-accent/40 transition-all cursor-pointer space-y-2 shadow-sm glass-hover"
                >
                  <span className="text-[10px] text-text-strong font-mono font-bold block">{item.file}</span>
                  <p className="text-[10px] text-text font-body leading-relaxed line-clamp-3">
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
