import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export function DefaultErrorFallback({ error, reset }: { error: Error | null; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[250px] w-full h-full bg-[#141924]/40 border border-rose-500/10 rounded-2xl glass text-center space-y-4 select-text">
      <div className="p-3 bg-rose-500/10 rounded-full text-rose-400 animate-pulse">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
          Component Error
        </h3>
        <p className="text-[10px] text-gray-400 font-mono bg-[#0A0D12]/60 px-3 py-2 rounded-lg border border-[#222834] max-h-[80px] overflow-y-auto text-left break-all select-all scrollbar-thin">
          {error?.message || "An unexpected rendering error occurred in this workspace view."}
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF9D4D] hover:bg-[#FFB073] text-[#0A0D12] font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Reset View</span>
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}
