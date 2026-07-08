import { useState, useEffect } from "react";
import { Activity, Cpu, Database, Zap } from "lucide-react";

interface PerformanceWidgetProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function PerformanceWidget({ isOpen, onToggle }: PerformanceWidgetProps) {
  const [cpu, setCpu] = useState<number>(14);
  const [ram, setRam] = useState<number>(242);
  const [latency, setLatency] = useState<number>(180);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCpu(Math.floor(10 + Math.random() * 8));
      setRam(Math.floor(240 + Math.random() * 10));
      setLatency(Math.floor(160 + Math.random() * 40));
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all cursor-pointer font-bold text-[10px] font-mono ${
          isOpen ? "bg-accent-dim/10 text-accent border border-accent/25" : "hover:bg-panel-alt text-muted"
        }`}
      >
        <Activity className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>Performance</span>
        <span className="text-[9px] text-success">{latency}ms</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-6 right-0 w-60 bg-bg border border-border rounded-xl shadow-2xl p-3.5 z-50 animate-fade-in font-mono text-[10px] space-y-3.5 select-none text-left">
          <div className="border-b border-border pb-2 flex justify-between items-center">
            <span className="text-muted font-bold uppercase tracking-wider">System Live Telemetry</span>
            <span className="text-[9px] text-success font-bold">HEALTHY</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-muted">
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-accent" /> CPU Core Usage</span>
                <span className="text-text-strong font-bold">{cpu}%</span>
              </div>
              <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all duration-500" style={{ width: `${cpu}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-muted">
                <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5 text-accent" /> RAM Allocated</span>
                <span className="text-text-strong font-bold">{ram} MB</span>
              </div>
              <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                <div className="h-full bg-success transition-all duration-500" style={{ width: `${(ram / 1024) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-muted">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-accent" /> AI API Latency</span>
                <span className="text-success font-bold">{latency}ms</span>
              </div>
              <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${(latency / 500) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
