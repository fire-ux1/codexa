import { useMemo, useState, useEffect, useRef } from "react";
import {
  askQuestion,
  cloneRepository,
  fetchArchitecture,
  fetchCallGraph,
  fetchFlow,
  getErrorMessage,
  indexRepository,
} from "./services/api";

// Custom SVG Icons

function IconSparkles({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function IconCpu({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
  );
}

function IconNetwork({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconFlow({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function IconTerminal({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconSearch({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function IconFolder({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function IconCode({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function IconDatabase({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function IconLink({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function IconCopy({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}


// Light Text Formatter (custom markdown-like rendering)
function FormatText({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        // Code blocks
        if (line.trim().startsWith("```")) {
          return null; // Skip raw indicators, let pre handle blocks or group them
        }

        // List item
        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          const content = line.trim().substring(2);
          return (
            <ul key={idx} className="list-disc pl-5 text-gray-300">
              <li>{parseInlineCode(content)}</li>
            </ul>
          );
        }

        // Heading 3
        if (line.trim().startsWith("### ")) {
          return (
            <h3 key={idx} className="text-md font-semibold text-indigo-400 mt-4">
              {line.trim().substring(4)}
            </h3>
          );
        }

        // Heading 2
        if (line.trim().startsWith("## ")) {
          return (
            <h2 key={idx} className="text-lg font-bold text-violet-300 mt-5 border-b border-white/5 pb-1">
              {line.trim().substring(3)}
            </h2>
          );
        }

        // Numbered list items
        const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 text-gray-300 pl-2">
              <span className="text-indigo-400 font-semibold">{numMatch[1]}.</span>
              <div>{parseInlineCode(numMatch[2])}</div>
            </div>
          );
        }

        // Regular line
        return (
          <p key={idx} className="text-gray-300 leading-relaxed text-[14px]">
            {parseInlineCode(line)}
          </p>
        );
      })}
    </div>
  );
}

function parseInlineCode(str) {
  const parts = [];
  const regex = /`([^`]+)`/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    parts.push(
      <code key={match.index} className="bg-black/40 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[13px] border border-white/5">
        {match[1]}
      </code>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts.length > 0 ? parts : str;
}

const sampleQuestions = [
  "Which files contain the main API routes?",
  "Explain the structure of the RAG assistant implementation.",
  "How are function calls extracted and resolved in the call graph?",
  "What is the entry point of the FastAPI application?",
];

export default function App() {
  // Setup States
  const [repoUrl, setRepoUrl] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Output States
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [architecture, setArchitecture] = useState("");
  const [callGraph, setCallGraph] = useState(null);
  const [flowData, setFlowData] = useState(null);

  // Status metrics
  const [metrics, setMetrics] = useState({
    filesIndexed: 0,
    chunksIndexed: 0,
  });

  // Action Loading States
  const [isCloning, setIsCloning] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isArchitectureLoading, setIsArchitectureLoading] = useState(false);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [isFlowLoading, setIsFlowLoading] = useState(false);

  // Global Console Status
  const [status, setStatus] = useState({
    tone: "idle", // 'idle', 'loading', 'success', 'error'
    label: "Workspace Status",
    message: "Welcome to CodePilot. Enter a repository URL to begin indexing.",
  });

  // Interactive Call Graph States
  const [graphSearch, setGraphSearch] = useState("");
  const [selectedFunc, setSelectedFunc] = useState(null);

  // Copy States
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Refs for Chat Auto-scroll
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isAsking]);

  const repositoryReady = Boolean(repoPath);

  // Quick Reset
  const clearWorkspace = () => {
    setRepoPath("");
    setQuestion("");
    setChatHistory([]);
    setArchitecture("");
    setCallGraph(null);
    setFlowData(null);
    setMetrics({ filesIndexed: 0, chunksIndexed: 0 });
    setActiveTab("overview");
    setSelectedFunc(null);
    setStatus({
      tone: "idle",
      label: "Workspace Status",
      message: "Ready to index a new repository.",
    });
  };

  // Helper error handler
  const setErrorState = (message) => {
    setStatus({
      tone: "error",
      label: "System Error",
      message,
    });
  };

  // 1. Clone + Index Repository Action
  const handleIndexRepository = async () => {
    if (!repoUrl.trim()) {
      setErrorState("Repository URL cannot be empty.");
      return;
    }

    try {
      setIsCloning(true);
      setStatus({
        tone: "loading",
        label: "Cloning Repository",
        message: "Fetching git repository files into the secure workspace...",
      });

      const cloneRes = await cloneRepository(repoUrl.trim());
      
      setStatus({
        tone: "loading",
        label: "Indexing Codebase",
        message: "Parsing python symbols and building vector index...",
      });

      const indexRes = await indexRepository(cloneRes.path);
      
      setRepoPath(cloneRes.path);
      setMetrics({
        filesIndexed: indexRes.files_indexed,
        chunksIndexed: indexRes.chunks_indexed,
      });

      setStatus({
        tone: "success",
        label: "Ready",
        message: `Successfully indexed ${indexRes.files_indexed} files and ${indexRes.chunks_indexed} code symbols!`,
      });

      // Clear previous outputs
      setChatHistory([]);
      setArchitecture("");
      setCallGraph(null);
      setFlowData(null);
      setSelectedFunc(null);
      setActiveTab("overview");
    } catch (error) {
      console.error(error);
      setRepoPath("");
      setErrorState(getErrorMessage(error, "Analysis initialization failed. Check repository accessibility."));
    } finally {
      setIsCloning(false);
    }
  };

  // 2. Chat grounded queries
  const handleAskQuestion = async (selectedQuestion = null) => {
    const query = selectedQuestion || question;
    if (!query.trim()) return;

    // Add user message to history
    const userMsg = { role: "user", content: query };
    setChatHistory((prev) => [...prev, userMsg]);
    setQuestion("");
    setIsAsking(true);
    setActiveTab("chat");

    setStatus({
      tone: "loading",
      label: "AI Processing",
      message: "Querying index and drafting response...",
    });

    try {
      const response = await askQuestion(query.trim());
      const botMsg = {
        role: "assistant",
        content: response.answer,
        sources: response.sources || [],
      };
      setChatHistory((prev) => [...prev, botMsg]);
      setStatus({
        tone: "success",
        label: "AI Answer Ready",
        message: `Fetched answers grounded in ${botMsg.sources.length} matching code segments.`,
      });
    } catch (error) {
      console.error(error);
      const errMsg = getErrorMessage(error, "AI assistant was unable to process this question.");
      setChatHistory((prev) => [...prev, { role: "assistant", content: `Error: ${errMsg}`, sources: [] }]);
      setErrorState(errMsg);
    } finally {
      setIsAsking(false);
    }
  };

  // 3. Generate Architecture Summary
  const handleGetArchitecture = async () => {
    try {
      setIsArchitectureLoading(true);
      setActiveTab("architecture");
      setStatus({
        tone: "loading",
        label: "Architecture Report",
        message: "Inspecting codebase structure and generating overview...",
      });

      const response = await fetchArchitecture(repoPath);
      setArchitecture(response.analysis);
      setStatus({
        tone: "success",
        label: "Architecture Ready",
        message: "Architectural analysis report compiled successfully.",
      });
    } catch (error) {
      console.error(error);
      setErrorState(getErrorMessage(error, "Failed to compile architecture details."));
    } finally {
      setIsArchitectureLoading(false);
    }
  };

  // 4. Generate Call Graph
  const handleGetCallGraph = async () => {
    try {
      setIsGraphLoading(true);
      setActiveTab("graph");
      setStatus({
        tone: "loading",
        label: "Call Graph",
        message: "Analyzing function mappings and dependencies...",
      });

      const response = await fetchCallGraph(repoPath);
      setCallGraph(response);

      // Auto select first function if graph exists
      const keys = Object.keys(response);
      if (keys.length > 0) {
        setSelectedFunc(keys[0]);
      }

      setStatus({
        tone: "success",
        label: "Call Graph Ready",
        message: `Mapped call relations across ${keys.length} defined symbols.`,
      });
    } catch (error) {
      console.error(error);
      setErrorState(getErrorMessage(error, "Failed to compile call graph mappings."));
    } finally {
      setIsGraphLoading(false);
    }
  };

  // 5. Generate Execution Flow
  const handleGetFlow = async () => {
    try {
      setIsFlowLoading(true);
      setActiveTab("flow");
      setStatus({
        tone: "loading",
        label: "Execution Flow",
        message: "Building code pipeline execution tracing...",
      });

      const response = await fetchFlow(repoPath);
      setFlowData(response);
      setStatus({
        tone: "success",
        label: "Execution Flow Ready",
        message: "Flow trace timeline generated successfully.",
      });
    } catch (error) {
      console.error(error);
      setErrorState(getErrorMessage(error, "Failed to generate execution flow timeline."));
    } finally {
      setIsFlowLoading(false);
    }
  };

  // Click source to populate question or inspect symbol
  const handleInspectSymbol = (symbolName) => {
    if (callGraph && callGraph[symbolName]) {
      setSelectedFunc(symbolName);
      setActiveTab("graph");
    } else {
      setQuestion(`Explain function or module: ${symbolName}`);
      setActiveTab("chat");
    }
  };

  // Call Graph helper logic
  const filteredFunctions = useMemo(() => {
    if (!callGraph) return [];
    const keys = Object.keys(callGraph);
    if (!graphSearch.trim()) return keys;
    return keys.filter((key) => key.toLowerCase().includes(graphSearch.toLowerCase()));
  }, [callGraph, graphSearch]);

  // Find callers of a function
  const functionCallers = useMemo(() => {
    if (!callGraph || !selectedFunc) return [];
    const callers = [];
    Object.entries(callGraph).forEach(([funcName, callees]) => {
      if (callees.includes(selectedFunc) && funcName !== selectedFunc) {
        callers.push(funcName);
      }
    });
    return callers;
  }, [callGraph, selectedFunc]);

  // Copy to clipboard helper
  const copyTextToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split paths helper
  const parseSymbolLabel = (symbolStr) => {
    if (!symbolStr.includes("::")) return { file: "", name: symbolStr };
    const [file, name] = symbolStr.split("::");
    return { file, name };
  };

  // Status Line Class tone mapping
  const statusTones = {
    idle: "border-white/10 bg-white/5 text-gray-300",
    loading: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 animate-pulse",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    error: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  };

  return (
    <div className="min-h-screen relative pb-10">
      {/* Background glow graphics */}
      <div className="glow-orb top-0 right-1/4"></div>
      <div className="glow-orb top-1/2 left-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10">
        
        {/* TOP STATUS LINE */}
        <div className={`mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border ${statusTones[status.tone]} transition-all duration-300 glass`}>
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.tone === 'loading' ? 'bg-indigo-400' : status.tone === 'success' ? 'bg-emerald-400' : status.tone === 'error' ? 'bg-rose-400' : 'bg-gray-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status.tone === 'loading' ? 'bg-indigo-500' : status.tone === 'success' ? 'bg-emerald-500' : status.tone === 'error' ? 'bg-rose-500' : 'bg-gray-500'}`}></span>
            </span>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold opacity-75 mr-2">[{status.label}]</span>
              <span className="text-sm font-medium text-white">{status.message}</span>
            </div>
          </div>
          {repositoryReady && (
            <button 
              onClick={clearWorkspace}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/20 transition-all font-medium flex items-center gap-2"
            >
              Change Repository
            </button>
          )}
        </div>

        {/* ONBOARDING STATE */}
        {!repositoryReady ? (
          <div className="animate-fade-in max-w-4xl mx-auto my-12">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4 animate-bounce">
                <IconSparkles className="w-3.5 h-3.5" /> CodePilot v1.0 Active
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-indigo-400 tracking-tight">
                Deconstruct Codebases Instantly.
              </h1>
              <p className="mt-4 text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Connect your repository to auto-generate timelines of execution paths, explore functional call graphs, compile architecture designs, and chat directly with code modules.
              </p>
            </div>

            {/* Input Card */}
            <div className="p-8 rounded-3xl border border-white/10 bg-gray-900/50 backdrop-blur-xl shadow-2xl relative overflow-hidden glass">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2.5">
                    Repository URL (GitHub, GitLab, or HTTPS Git Endpoints)
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                      <IconLink className="w-5 h-5 text-indigo-400" />
                    </div>
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      disabled={isCloning}
                      className="block w-full pl-12 pr-4 py-4 rounded-2xl bg-black/40 border border-white/10 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 text-white placeholder-gray-500 focus:outline-none transition-all font-mono text-[14px]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleIndexRepository}
                    disabled={isCloning || !repoUrl.trim()}
                    className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold text-sm transition-all duration-150 flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                  >
                    {isCloning ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        Indexing Codebase...
                      </>
                    ) : (
                      <>
                        <IconDatabase className="w-4 h-4" />
                        Clone + Index Repository
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setRepoUrl("https://github.com/abhishek-s12/codepilot-ai")}
                    className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-all border border-white/10 hover:border-white/20"
                  >
                    Try Sample Repository
                  </button>
                </div>
              </div>
            </div>

            {/* Features Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div className="p-5 rounded-2xl border border-white/5 bg-white/2.5 glass glass-hover">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3.5">
                  <IconTerminal className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Semantic Chat</h3>
                <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                  Interactive assistant grounded strictly in your repository contents. Retrieves specific symbols and files to reference answers.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-white/2.5 glass glass-hover">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3.5">
                  <IconNetwork className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Interactive Call Graph</h3>
                <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                  Map functional call structures across modules. Seamlessly trace incoming caller pipelines and outgoing function dependencies.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-white/2.5 glass glass-hover">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3.5">
                  <IconFlow className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Execution Flow Timeline</h3>
                <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                  View logical execution paths formatted as a sequential visual timeline with modular steps and detailed architectural descriptions.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-white/5 bg-white/2.5 glass glass-hover">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3.5">
                  <IconCpu className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Architecture Summaries</h3>
                <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                  Generate structural summaries of high-level models, API layouts, dependencies, strengths, and areas of architectural recommendations.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE WORKSPACE LAYOUT */
          <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
            
            {/* LEFT ACTIONS COLLAPSIBLE DRAWER */}
            <div className="space-y-6 lg:sticky lg:top-6">
              
              {/* Workspace details */}
              <div className="p-5 rounded-2xl border border-white/10 bg-gray-900/40 glass">
                <div className="flex items-center gap-2 mb-3.5">
                  <IconFolder className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400">Workspace Details</h3>
                </div>
                
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-gray-500">Repository Root</span>
                    <p className="text-white break-all bg-black/30 p-2 rounded-lg mt-1 text-[11px] border border-white/5">{repoPath}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-gray-500 block mb-0.5">Files Indexed</span>
                      <span className="text-white text-sm font-semibold">{metrics.filesIndexed}</span>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-gray-500 block mb-0.5">Code Symbols</span>
                      <span className="text-white text-sm font-semibold">{metrics.chunksIndexed}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Jobs Trigger Panel */}
              <div className="p-5 rounded-2xl border border-white/10 bg-gray-900/40 glass">
                <div className="flex items-center gap-2 mb-4">
                  <IconCpu className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400">Codebase Analyzers</h3>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleGetArchitecture}
                    disabled={isArchitectureLoading}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 hover:border-indigo-500/40 bg-white/5 hover:bg-indigo-500/5 text-left text-sm font-semibold text-white transition-all flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconCpu className="w-4 h-4 text-indigo-400" /> System Architecture
                    </span>
                    {isArchitectureLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin"></span>
                    ) : (
                      <IconArrowRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  <button
                    onClick={handleGetCallGraph}
                    disabled={isGraphLoading}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 hover:border-purple-500/40 bg-white/5 hover:bg-purple-500/5 text-left text-sm font-semibold text-white transition-all flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconNetwork className="w-4 h-4 text-purple-400" /> Code Call Graph
                    </span>
                    {isGraphLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin"></span>
                    ) : (
                      <IconArrowRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  <button
                    onClick={handleGetFlow}
                    disabled={isFlowLoading}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 hover:border-emerald-500/40 bg-white/5 hover:bg-emerald-500/5 text-left text-sm font-semibold text-white transition-all flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconFlow className="w-4 h-4 text-emerald-400" /> Execution Flow
                    </span>
                    {isFlowLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin"></span>
                    ) : (
                      <IconArrowRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Sidebar Prompt Input */}
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
                    onClick={() => handleAskQuestion()}
                    disabled={isAsking || !question.trim()}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.99]"
                  >
                    {isAsking ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        Searching Context...
                      </>
                    ) : (
                      <>
                        <IconSparkles className="w-3.5 h-3.5" />
                        Run Assistant Query
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE ACTIVE TAB MAIN CANVAS */}
            <div className="space-y-6">
              
              {/* Tab Switch Headers */}
              <div className="p-2 rounded-2xl border border-white/10 bg-gray-900/60 flex flex-wrap gap-1 glass">
                {[
                  { key: "overview", label: "Overview", icon: IconFolder },
                  { key: "chat", label: "Chat Session", icon: IconTerminal },
                  { key: "architecture", label: "System Architecture", icon: IconCpu },
                  { key: "graph", label: "Interactive Call Graph", icon: IconNetwork },
                  { key: "flow", label: "Execution Flow", icon: IconFlow },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 min-w-[120px] py-3.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                        active
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <TabIcon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Panels Canvas */}
              <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-gray-900/40 backdrop-blur-xl shadow-2xl glass relative min-h-[500px]">
                
                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className="space-y-8 animate-fade-in">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                        <IconFolder className="w-6 h-6 text-indigo-400" /> Repository Overview
                      </h2>
                      <p className="mt-1 text-sm text-soft leading-relaxed">
                        Workspace index completed. Select one of the primary workflows below or run assistant prompts.
                      </p>
                    </div>

                    {/* Stats Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl bg-black/30 border border-white/5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Index Status</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-white text-md font-semibold font-mono">INDEXED_READY</span>
                        </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-black/30 border border-white/5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Source Code Files</span>
                        <span className="text-white text-xl font-bold font-mono mt-1 block">{metrics.filesIndexed}</span>
                      </div>
                      <div className="p-5 rounded-2xl bg-black/30 border border-white/5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">Language Scope</span>
                        <span className="text-white text-xl font-bold font-mono mt-1 block">Python & Text</span>
                      </div>
                    </div>

                    {/* Getting started path card */}
                    <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <h3 className="text-sm font-semibold text-indigo-300 mb-3">Quick Navigation Tasks</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-gray-300">
                        <button 
                          onClick={handleGetArchitecture}
                          className="p-3.5 rounded-xl border border-white/5 bg-black/20 hover:bg-black/30 text-left hover:border-indigo-500/20 transition-all flex items-center justify-between"
                        >
                          <span>Generate Architecture Summaries</span>
                          <IconArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button 
                          onClick={handleGetCallGraph}
                          className="p-3.5 rounded-xl border border-white/5 bg-black/20 hover:bg-black/30 text-left hover:border-purple-500/20 transition-all flex items-center justify-between"
                        >
                          <span>Map Code Call Mappings</span>
                          <IconArrowRight className="w-3.5 h-3.5 text-purple-400" />
                        </button>
                        <button 
                          onClick={handleGetFlow}
                          className="p-3.5 rounded-xl border border-white/5 bg-black/20 hover:bg-black/30 text-left hover:border-emerald-500/20 transition-all flex items-center justify-between"
                        >
                          <span>Trace Execution Pipelines</span>
                          <IconArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button 
                          onClick={() => setActiveTab("chat")}
                          className="p-3.5 rounded-xl border border-white/5 bg-black/20 hover:bg-black/30 text-left hover:border-amber-500/20 transition-all flex items-center justify-between"
                        >
                          <span>Start Codebase Conversation</span>
                          <IconArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>
                    </div>

                    {/* Suggestions Area */}
                    <div>
                      <h3 className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                        <IconSparkles className="w-3.5 h-3.5 text-indigo-400" /> Suggested Prompts
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {sampleQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAskQuestion(q)}
                            className="p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 text-left text-xs text-gray-400 hover:text-white transition-all duration-200 block"
                          >
                            "{q}"
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* CHAT SESSION TAB */}
                {activeTab === "chat" && (
                  <div className="space-y-6 animate-fade-in flex flex-col min-h-[500px]">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <IconTerminal className="w-5 h-5 text-indigo-400" /> Assistant Conversation
                      </h2>
                      <p className="mt-1 text-xs text-soft leading-relaxed">
                        Chats are securely grounded in repository contexts. The system retrieves codebase references to draft responses.
                      </p>
                    </div>

                    {/* Message Log */}
                    <div className="flex-grow space-y-4 max-h-[450px] overflow-y-auto pr-2 pb-4">
                      {chatHistory.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 space-y-3">
                          <IconTerminal className="w-10 h-10 mx-auto text-gray-600 opacity-60" />
                          <p className="text-sm">No queries started yet. Type a question in the prompt sidebar or select a suggestion.</p>
                        </div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`p-4.5 rounded-2xl border transition-all ${
                              msg.role === "user"
                                ? "bg-white/2.5 border-white/5 self-end"
                                : "bg-indigo-500/5 border-indigo-500/10"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  msg.role === "user" 
                                    ? "bg-white/5 text-gray-300" 
                                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20"
                                }`}>
                                  {msg.role === "user" ? "Developer" : "CodePilot Assistant"}
                                </span>
                              </div>
                              <button
                                onClick={() => copyTextToClipboard(msg.content, idx)}
                                className="p-1 rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-all"
                              >
                                {copiedIndex === idx ? (
                                  <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <IconCopy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            
                            <div className="text-sm font-normal text-gray-200">
                              <FormatText text={msg.content} />
                            </div>

                            {/* Attributed Sources */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-4 pt-3.5 border-t border-white/5">
                                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-2">Codebase Context Checked:</span>
                                <div className="flex flex-wrap gap-2">
                                  {msg.sources.map((src, sIdx) => (
                                    <button
                                      key={sIdx}
                                      onClick={() => handleInspectSymbol(src.symbol || src.file)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-white/5 text-xs text-indigo-300 hover:border-indigo-500/30 transition-all font-mono"
                                    >
                                      <IconCode className="w-3 h-3 text-indigo-400" />
                                      {src.symbol || src.file}
                                      <span className="text-[9px] text-gray-500 ml-1">({src.score})</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {/* Loading display */}
                      {isAsking && (
                        <div className="p-4.5 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 animate-pulse flex items-start gap-3">
                          <span className="w-3.5 h-3.5 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin mt-0.5"></span>
                          <span className="text-xs font-mono text-indigo-400">Searching codebase references and formatting answer...</span>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>
                  </div>
                )}

                {/* ARCHITECTURE TAB */}
                {activeTab === "architecture" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <IconCpu className="w-5 h-5 text-indigo-400" /> System Architecture Summary
                      </h2>
                      <p className="mt-1 text-xs text-soft leading-relaxed">
                        Examines modular structures, framework layers, entry components, and system architecture recommendations.
                      </p>
                    </div>

                    {!architecture ? (
                      <div className="py-16 text-center text-gray-500 space-y-4">
                        <IconCpu className="w-10 h-10 mx-auto text-gray-600 opacity-60" />
                        <p className="text-sm">Architecture summary not compiled yet.</p>
                        <button
                          onClick={handleGetArchitecture}
                          disabled={isArchitectureLoading}
                          className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all inline-flex items-center gap-1.5"
                        >
                          {isArchitectureLoading ? "Compiling..." : "Generate Architecture Report"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="p-5 rounded-2xl border border-white/5 bg-black/20 font-mono text-xs">
                          <h3 className="text-xs uppercase font-bold text-gray-400 mb-2">Project Outline</h3>
                          <p className="text-gray-300 leading-relaxed">Codebase analyzed under path: <span className="text-indigo-300">{repoPath}</span></p>
                        </div>
                        
                        <div className="p-6 rounded-2xl border border-white/5 bg-white/2.5">
                          <FormatText text={architecture} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* INTERACTIVE CALL GRAPH TAB */}
                {activeTab === "graph" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <IconNetwork className="w-5 h-5 text-indigo-400" /> Interactive Dependency Call Graph
                      </h2>
                      <p className="mt-1 text-xs text-soft leading-relaxed">
                        Trace functional hierarchies. Select defined classes and methods to view callers and outbound dependency calls.
                      </p>
                    </div>

                    {!callGraph ? (
                      <div className="py-16 text-center text-gray-500 space-y-4">
                        <IconNetwork className="w-10 h-10 mx-auto text-gray-600 opacity-60" />
                        <p className="text-sm">Call graph mappings not calculated yet.</p>
                        <button
                          onClick={handleGetCallGraph}
                          disabled={isGraphLoading}
                          className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all inline-flex items-center gap-1.5"
                        >
                          {isGraphLoading ? "Mapping..." : "Map Code Call Mappings"}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
                        
                        {/* Function Symbol Sidebar Registry */}
                        <div className="space-y-3.5">
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                              <IconSearch className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              value={graphSearch}
                              onChange={(e) => setGraphSearch(e.target.value)}
                              placeholder="Search functions..."
                              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60"
                            />
                          </div>

                          <div className="max-h-[380px] overflow-y-auto border border-white/5 rounded-xl bg-black/20 divide-y divide-white/5">
                            {filteredFunctions.length === 0 ? (
                              <p className="p-4 text-xs text-gray-500 text-center font-mono">No matching symbols</p>
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
                                        ? "bg-indigo-600 text-white font-medium" 
                                        : "text-gray-400 hover:text-gray-200 hover:bg-white/2.5"
                                    }`}
                                  >
                                    <div className="truncate font-semibold">{parsed.name}</div>
                                    {parsed.file && <div className={`truncate text-[9px] mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-gray-500'}`}>{parsed.file}</div>}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Selected Function Call Mapping */}
                        {selectedFunc ? (
                          <div className="space-y-6">
                            
                            {/* Current Function Header Banner */}
                            <div className="p-4.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider font-mono">Selected Symbol</span>
                              <h3 className="text-base font-bold text-white font-mono truncate mt-1">
                                {parseSymbolLabel(selectedFunc).name}
                              </h3>
                              <p className="text-[10px] text-gray-500 font-mono truncate mt-0.5">
                                Defined in: {parseSymbolLabel(selectedFunc).file || "Repository root"}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              
                              {/* Callers Card */}
                              <div className="p-5 rounded-2xl border border-white/5 bg-black/25 min-h-[180px] flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-3 font-mono flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping"></span>
                                  Callers (Incoming)
                                </span>
                                
                                <div className="flex-grow space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                  {functionCallers.length === 0 ? (
                                    <p className="text-xs text-gray-600 italic font-mono pt-4 text-center">No incoming calls detected.</p>
                                  ) : (
                                    functionCallers.map((caller) => (
                                      <button
                                        key={caller}
                                        onClick={() => setSelectedFunc(caller)}
                                        className="w-full p-2.5 rounded-xl bg-white/5 border border-white/5 text-left text-xs font-mono text-gray-300 hover:text-white hover:border-indigo-500/20 hover:bg-white/10 transition-all block truncate"
                                      >
                                        {parseSymbolLabel(caller).name}
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* Callees Card */}
                              <div className="p-5 rounded-2xl border border-white/5 bg-black/25 min-h-[180px] flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-3 font-mono flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                  Callees (Outgoing)
                                </span>

                                <div className="flex-grow space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                  {!callGraph[selectedFunc] || callGraph[selectedFunc].length === 0 ? (
                                    <p className="text-xs text-gray-600 italic font-mono pt-4 text-center">Calls no internal functions.</p>
                                  ) : (
                                    callGraph[selectedFunc].map((callee) => (
                                      <button
                                        key={callee}
                                        onClick={() => setSelectedFunc(callee)}
                                        className="w-full p-2.5 rounded-xl bg-white/5 border border-white/5 text-left text-xs font-mono text-gray-300 hover:text-white hover:border-indigo-500/20 hover:bg-white/10 transition-all block truncate"
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
                          <div className="py-24 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                            <p className="text-xs font-mono">Select a function symbol from the sidebar to inspect dependencies.</p>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}

                {/* EXECUTION FLOW TIMELINE TAB */}
                {activeTab === "flow" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <IconFlow className="w-5 h-5 text-indigo-400" /> Code Execution Trace Flow
                      </h2>
                      <p className="mt-1 text-xs text-soft leading-relaxed">
                        Visual sequential timeline tracing how requests pipeline across modules, supported by architectural step descriptions.
                      </p>
                    </div>

                    {!flowData ? (
                      <div className="py-16 text-center text-gray-500 space-y-4">
                        <IconFlow className="w-10 h-10 mx-auto text-gray-600 opacity-60" />
                        <p className="text-sm">Trace timeline not generated yet.</p>
                        <button
                          onClick={handleGetFlow}
                          disabled={isFlowLoading}
                          className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all inline-flex items-center gap-1.5"
                        >
                          {isFlowLoading ? "Tracing..." : "Generate Execution Flow"}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                        
                        {/* Flow Timeline Nodes (Left Column) */}
                        <div className="space-y-4">
                          <h3 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 font-mono">Execution Flow Path</h3>
                          <div className="relative border-l border-indigo-500/20 pl-6 ml-3 space-y-8 py-2">
                            {flowData.flow.split("\n\n").map((segment, idx) => {
                              const steps = segment.split("\n    ->\n");
                              return (
                                <div key={idx} className="relative group">
                                  {/* timeline dot indicator */}
                                  <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-950 border border-indigo-400/50 group-hover:scale-110 transition-transform">
                                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                                  </span>
                                  
                                  <div className="p-4 rounded-2xl border border-white/5 bg-black/20 group-hover:border-indigo-500/10 transition-all space-y-2">
                                    {steps.map((step, sIdx) => {
                                      const parsed = parseSymbolLabel(step);
                                      return (
                                        <div key={sIdx} className="flex flex-col">
                                          {sIdx > 0 && (
                                            <div className="pl-3 py-1 flex items-center text-indigo-400/40 text-[10px]">
                                              <span className="font-mono">▼ calls</span>
                                            </div>
                                          )}
                                          <button
                                            onClick={() => handleInspectSymbol(step)}
                                            className="text-left font-mono text-xs text-indigo-300 hover:text-indigo-200 truncate font-semibold pl-2 hover:bg-white/5 rounded py-1 transition-all"
                                          >
                                            {parsed.name}
                                            {parsed.file && <span className="text-[9px] text-gray-500 font-normal ml-2">({parsed.file})</span>}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Flow Explanation Cards (Right Column) */}
                        <div className="space-y-4">
                          <h3 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2 font-mono">Architectural Explanation</h3>
                          <div className="p-6 rounded-2xl border border-white/5 bg-white/2.5">
                            <FormatText text={flowData.explanation} />
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
