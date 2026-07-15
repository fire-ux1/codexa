import { useState, useEffect, useRef } from "react";
import { AlertCircle, AlertTriangle, Cpu, Database, Maximize2, Minimize2, Copy, Check } from "lucide-react";
import GitPanel from "../git/GitPanel";

interface TerminalLine {
  text: string;
  type: "sys" | "cmd" | "success" | "warn" | "error";
}

interface BottomPanelProps {
  repoPath: string | null | undefined;
  filesList?: string[];
  activeTab?: string;
  onClose?: () => void;
}

export default function BottomPanel({
  repoPath,
  filesList = [],
  activeTab = "terminal",
  onClose = () => {},
}: BottomPanelProps) {
  const [currentTab, setCurrentTab] = useState<string>(activeTab);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([
    { text: "Microsoft Windows [Version 10.0.22631]", type: "sys" },
    { text: "(c) Microsoft Corporation. All rights reserved.", type: "sys" },
    { text: "", type: "sys" },
    { text: "d:\\codepilot-ai> npm run dev", type: "cmd" },
    { text: "codepilot-ai@1.0.0 dev", type: "sys" },
    { text: "vite --host 0.0.0.0 --port 5173", type: "sys" },
    { text: "  VITE v8.0.16  ready in 234 ms", type: "success" },
    { text: "  ➜  Local:   http://localhost:5173/", type: "success" },
    { text: "  ➜  Network: use --host to expose", type: "success" },
  ]);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copiedTerminal, setCopiedTerminal] = useState<boolean>(false);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    const newLines: TerminalLine[] = [...terminalHistory, { text: `d:\\codepilot-ai> ${cmd}`, type: "cmd" }];

    if (cmd === "clear") {
      setTerminalHistory([]);
      setTerminalInput("");
      return;
    } else if (cmd === "git status") {
      newLines.push({ text: "On branch main", type: "sys" });
      newLines.push({ text: "Your branch is up to date with 'origin/main'.", type: "sys" });
      newLines.push({ text: "Changes not staged for commit:", type: "sys" });
      newLines.push({ text: "  (use \"git add <file>...\" to update what will be committed)", type: "sys" });
      newLines.push({ text: "       modified:   frontend/src/components/workspace/AIWorkspace.jsx", type: "warn" });
    } else if (cmd.startsWith("npm run")) {
      newLines.push({ text: "Running custom script block...", type: "sys" });
      newLines.push({ text: "Done. Script finished with code 0.", type: "success" });
    } else if (cmd === "help") {
      newLines.push({ text: "Available commands: help, clear, git status, npm run build, node -v, system-metrics", type: "sys" });
    } else {
      newLines.push({ text: `'${cmd}' is not recognized as an internal or external command, operable program or batch file.`, type: "error" });
    }

    setTerminalHistory(newLines);
    setTerminalInput("");
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalHistory]);

  const copyTerminalOutput = () => {
    const text = terminalHistory.map((h) => h.text).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  };

  const [cpuUsage, setCpuUsage] = useState<number>(14);
  const [memUsage, setMemUsage] = useState<number>(244);
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuUsage(Math.floor(10 + Math.random() * 8));
      setMemUsage(Math.floor(240 + Math.random() * 12));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const lineColorClass = (type: string) => {
    switch(type) {
      case "cmd": return "text-text-strong";
      case "success": return "text-success";
      case "warn": return "text-orange-400";
      case "error": return "text-danger";
      default: return "text-muted";
    }
  };

  return (
    <div className={`flex flex-col bg-panel border-t border-border select-none ${isMaximized ? "h-[75vh]" : "h-[280px]"} shadow-lg`}>
      
      {/* Header bar tabs */}
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5 bg-bg shrink-0 h-9">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: "terminal", label: "Terminal" },
            { id: "problems", label: "Problems" },
            { id: "git", label: "Git" },
            { id: "output", label: "Output" },
            { id: "logs", label: "Logs" },
            { id: "tasks", label: "AI Tasks" },
            { id: "performance", label: "Performance" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-2.5 py-1 rounded text-[12px] font-sans font-medium transition-all duration-150 cursor-pointer ${
                currentTab === tab.id
                  ? "bg-accent-dim/15 text-accent border border-accent/25 font-semibold"
                  : "text-muted hover:text-text border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 select-none">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded hover:bg-panel-alt text-muted hover:text-text cursor-pointer"
            title={isMaximized ? "Minimize Panel" : "Maximize Panel"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-danger-bg text-muted hover:text-danger ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Dynamic Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin select-text min-h-0 bg-bg">
        
        {/* TERMINAL TAB */}
        {currentTab === "terminal" && (
          <div className="flex flex-col h-full font-mono text-[10.5px] leading-relaxed">
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 pr-2 max-h-[190px] min-h-0 text-left">
              {terminalHistory.map((line, idx) => (
                <div key={idx} className={lineColorClass(line.type)}>
                  {line.text}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <form onSubmit={handleTerminalSubmit} className="flex items-center gap-1 border-t border-border pt-2 shrink-0 select-none mt-2">
              <span className="text-muted shrink-0">d:\codepilot-ai&gt;</span>
              <input
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="bg-transparent border-none outline-none text-text-strong w-full font-mono text-[10.5px]"
                autoFocus
              />
              <button
                type="button"
                onClick={copyTerminalOutput}
                className="p-1 rounded hover:bg-panel-alt text-muted hover:text-text cursor-pointer"
                title="Copy Terminal History"
              >
                {copiedTerminal ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        )}

        {/* PROBLEMS TAB */}
        {currentTab === "problems" && (
          <div className="space-y-3 font-mono text-[10px] text-left">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-danger-bg/15 text-danger border border-danger/25">
                <AlertCircle className="w-3 h-3" /> 0 Errors
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25">
                <AlertTriangle className="w-3 h-3" /> 1 Warning
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-orange-500/5 border border-orange-500/15 text-text">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-text-strong">Warning: Unused package imports</span>
                  <p className="text-muted mt-0.5">d:\codepilot-ai\backend\api\auth.py • line 12: imported 'jwt_decoder' but never referenced.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-accent-dim/10 border border-border text-text">
                <span className="text-xs shrink-0 mt-0.5">💡</span>
                <div>
                  <span className="font-bold text-accent">AI Quality Check: Refactoring target</span>
                  <p className="text-muted mt-0.5">Average function length in workspace analytics is high. Recommend extraction of subroutines.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GIT TAB */}
        {currentTab === "git" && (
          <div className="h-full">
            <GitPanel repoPath={repoPath ?? ""} />
          </div>
        )}

        {/* OUTPUT TAB */}
        {currentTab === "output" && (
          <div className="text-[10px] font-mono text-muted p-1 space-y-1.5 text-left leading-normal">
            <p>[CodePilot Compiler] Scanning source files in local environment...</p>
            <p>[CodePilot Compiler] Successfully indexed {filesList.length} files and {filesList.length * 8} code symbols in vector repository cache.</p>
            <p className="text-success">[CodePilot Compiler] Success: Workspace compilation complete. 0 errors, 1 warning.</p>
          </div>
        )}

        {/* LOGS TAB */}
        {currentTab === "logs" && (
          <div className="text-[10.5px] font-mono text-muted p-1 space-y-1.5 text-left leading-normal">
            <p className="text-accent">INFO:     127.0.0.1:53123 - "GET /repository/analytics HTTP/1.1" 200 OK</p>
            <p>INFO:     Uvicorn reloading files triggered by WatchFiles change...</p>
            <p>INFO:     Reloader detected change in 'backend/services/analytics_service.py'</p>
            <p className="text-success">INFO:     Started server process [29452] ready.</p>
          </div>
        )}

        {/* AI TASKS TAB */}
        {currentTab === "tasks" && (
          <div className="space-y-3.5 text-left">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wide">Active AI Scans</span>
              <span className="text-[8.5px] font-mono bg-accent-dim/15 text-accent border border-accent/20 px-2 py-0.5 rounded">1 Active</span>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-panel border border-border rounded-xl flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-text-strong block">Generating Unit Test Cases</span>
                  <p className="text-[9px] text-muted font-mono">Writing tests suite for 'backend/api/workspace.py'</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-[100px] h-1.5 bg-border rounded-full overflow-hidden select-none">
                    <div className="h-full bg-accent animate-pulse w-[65%]" />
                  </div>
                  <span className="text-[9.5px] font-mono text-accent font-bold">65%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {currentTab === "performance" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-3 bg-panel border border-border rounded-xl space-y-1 shadow-sm">
              <span className="text-[8px] text-muted uppercase tracking-widest font-mono font-bold flex items-center gap-1">
                <Cpu className="w-3 h-3 text-accent" /> CPU Usage
              </span>
              <span className="text-sm font-extrabold text-text-strong font-mono">{cpuUsage}%</span>
            </div>

            <div className="p-3 bg-panel border border-border rounded-xl space-y-1 shadow-sm">
              <span className="text-[8px] text-muted uppercase tracking-widest font-mono font-bold flex items-center gap-1">
                <Database className="w-3 h-3 text-accent" /> RAM Alloc
              </span>
              <span className="text-sm font-extrabold text-text-strong font-mono">{memUsage} MB</span>
            </div>

            <div className="p-3 bg-panel border border-border rounded-xl space-y-1 shadow-sm">
              <span className="text-[8px] text-muted uppercase tracking-widest font-mono font-bold">Token Session</span>
              <span className="text-sm font-extrabold text-text-strong font-mono">14,240 tokens</span>
            </div>

            <div className="p-3 bg-panel border border-border rounded-xl space-y-1 shadow-sm">
              <span className="text-[8px] text-muted uppercase tracking-widest font-mono font-bold">API Latency</span>
              <span className="text-sm font-extrabold text-success font-mono">180ms</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
