import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchTokenUsage,
  fetchCodebaseAnalytics,
  fetchWorkspaceActivity,
} from "../../services/api";

interface TokenData {
  date: string;
  input_tokens: number;
  output_tokens: number;
  requests: number;
}

interface CodebaseData {
  total_files: number;
  total_chunks: number;
  symbols: {
    classes: number;
    functions: number;
    modules: number;
  };
  file_ratios: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  metrics: {
    complexity_index: number;
    security_index: number;
    health_score: number;
  };
}

interface ActivityData {
  date: string;
  count: number;
}

interface AnalyticsDashboardProps {
  onBack?: () => void;
}

function safeDate(value: string): Date | null {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value: string, opts: Intl.DateTimeFormatOptions): string {
  const d = safeDate(value);
  return d ? d.toLocaleDateString(undefined, opts) : "Unknown date";
}

export default function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [codebase, setCodebase] = useState<CodebaseData | null>(null);
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);

  // Interactive states — "pinned" via click/keyboard, or transient via hover
  const [hoveredToken, setHoveredToken] = useState<TokenData | null>(null);
  const [pinnedToken, setPinnedToken] = useState<TokenData | null>(null);
  const [hoveredActivity, setHoveredActivity] = useState<ActivityData | null>(null);
  const [activityTooltipPos, setActivityTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const [hoveredRatio, setHoveredRatio] = useState<number | null>(null);

  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const activeToken = pinnedToken ?? hoveredToken;

  const loadAllAnalytics = useCallback(async (isRefresh: boolean) => {
    const controller = new AbortController();

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }
    setPartialErrors([]);

    const results = await Promise.allSettled([
      fetchTokenUsage(),
      fetchCodebaseAnalytics(),
      fetchWorkspaceActivity(),
    ]);

    if (!mountedRef.current) return controller;

    const [tokenResult, codebaseResult, activityResult] = results;
    const failures: string[] = [];

    if (tokenResult.status === "fulfilled") {
      setTokens(tokenResult.value as unknown as TokenData[]);
    } else {
      failures.push("token usage");
      console.error(tokenResult.reason);
    }

    if (codebaseResult.status === "fulfilled") {
      setCodebase(codebaseResult.value as unknown as CodebaseData);
    } else {
      failures.push("codebase analytics");
      console.error(codebaseResult.reason);
    }

    if (activityResult.status === "fulfilled") {
      setActivity(activityResult.value as unknown as ActivityData[]);
    } else {
      failures.push("workspace activity");
      console.error(activityResult.reason);
    }

    // Only show the full-page error state if the core dataset (codebase) failed
    // and we have nothing to show at all yet.
    if (codebaseResult.status === "rejected" && !codebase) {
      setError("Failed to retrieve analytics telemetry. Verify backend connection.");
    } else if (failures.length > 0) {
      setPartialErrors(failures.map((f) => `Couldn't refresh ${f}.`));
    }

    setLoading(false);
    setRefreshing(false);

    return controller;
  }, [codebase]);

  useEffect(() => {
    mountedRef.current = true;
    let controllerRef: AbortController | null = null;
    loadAllAnalytics(false).then((c) => {
      controllerRef = c;
    });
    return () => {
      mountedRef.current = false;
      controllerRef?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    loadAllAnalytics(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF9D4D]"></div>
        <p className="text-sm font-medium tracking-wide">Aggregating workspace telemetry...</p>
      </div>
    );
  }

  if (error || !codebase) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6 bg-[#10141B]/80 rounded-xl border border-red-500/20 backdrop-blur-md">
        <svg className="w-12 h-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-red-400 font-semibold mb-2">Telemetry Error</p>
        <p className="text-sm text-gray-400 max-w-md mb-6">{error || "Analytics unavailable."}</p>
        <button
          onClick={() => loadAllAnalytics(false)}
          className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#FF9D4D] text-[#0A0D12] hover:bg-[#ffae66] transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Calculate coordinates for custom SVG Token Area/Line Chart
  const svgWidth = 580;
  const svgHeight = 180;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxTokens = Math.max(
    ...tokens.map((t) => Math.max(t.input_tokens, t.output_tokens)),
    10000
  );

  // Guard against divide-by-zero when there's only one (or zero) data points
  const getX = (index: number) =>
    tokens.length > 1
      ? paddingLeft + (index / (tokens.length - 1)) * chartWidth
      : paddingLeft + chartWidth / 2;

  const getY = (value: number) => paddingTop + chartHeight - (value / maxTokens) * chartHeight;

  // SVG Area path constructors
  const inputPoints = tokens.map((t, idx) => `${getX(idx)},${getY(t.input_tokens)}`).join(" ");
  const outputPoints = tokens.map((t, idx) => `${getX(idx)},${getY(t.output_tokens)}`).join(" ");

  const inputAreaPath =
    tokens.length > 0
      ? `M ${getX(0)},${paddingTop + chartHeight} L ${inputPoints} L ${getX(tokens.length - 1)},${paddingTop + chartHeight} Z`
      : "";

  const outputAreaPath =
    tokens.length > 0
      ? `M ${getX(0)},${paddingTop + chartHeight} L ${outputPoints} L ${getX(tokens.length - 1)},${paddingTop + chartHeight} Z`
      : "";

  // Helper for Heatmap coloring based on activity frequency
  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-[#161B22]/40 border-[#1B2129]";
    if (count <= 2) return "bg-[#FF9D4D]/20 border-[#FF9D4D]/30 hover:border-[#FF9D4D]/60";
    if (count <= 5) return "bg-[#FF9D4D]/40 border-[#FF9D4D]/50 hover:border-[#FF9D4D]/70";
    if (count <= 8) return "bg-[#FF9D4D]/75 border-[#FF9D4D]/80 hover:border-[#FF9D4D]";
    return "bg-[#FF9D4D] border-[#FF9D4D] shadow-[0_0_8px_rgba(255,157,77,0.3)] hover:scale-105";
  };

  // Normalize file_ratios in case percentages don't sum to exactly 100
  const ratioTotal = codebase.file_ratios.reduce((sum, r) => sum + r.value, 0) || 1;
  const normalizedRatios = codebase.file_ratios.map((r) => ({
    ...r,
    normalizedValue: (r.value / ratioTotal) * 100,
  }));

  const handleActivityEnter = (act: ActivityData, e: React.MouseEvent<HTMLDivElement> | React.FocusEvent<HTMLDivElement>) => {
    const container = heatmapContainerRef.current;
    if (!container) return;
    const cellRect = e.currentTarget.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setActivityTooltipPos({
      left: cellRect.left - containerRect.left + cellRect.width / 2,
      top: cellRect.top - containerRect.top,
    });
    setHoveredActivity(act);
  };

  const estimatedHoursSaved = Math.round(codebase.total_chunks * 0.15 + 12);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#0A0D12]">
      {/* Dashboard Title Header */}
      <div className="flex justify-between items-center border-b border-[#1E2530] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9D4D] mr-3 animate-pulse"></span>
            Workspace ROI & Codebase Analytics
          </h1>
          <p className="text-sm text-gray-400 mt-1">Real-time health telemetry, LLM utilization patterns, and developer efficiency metrics.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#10141B] border border-[#1E2530] text-gray-300 hover:text-white hover:bg-[#161C26] hover:border-[#FF9D4D]/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v12" />
            </svg>
            <span>{refreshing ? "Refreshing…" : "Refresh Stats"}</span>
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#FF9D4D]/10 border border-[#FF9D4D]/25 text-[#FF9D4D] hover:bg-[#FF9D4D]/20 transition-all cursor-pointer"
            >
              <span>✕ Exit Analytics</span>
            </button>
          )}
        </div>
      </div>

      {/* Partial failure banner — shown when some (not all) data sources failed to refresh */}
      {partialErrors.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-2.5 text-xs text-amber-300">
          {partialErrors.join(" ")} Showing last known data for those sections.
        </div>
      )}

      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Indexed Files */}
        <div className="bg-[#10141B]/60 border border-[#1E2530] p-6 rounded-xl relative overflow-hidden group hover:border-[#FF9D4D]/40 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-opacity">
            <svg className="w-16 h-16 text-[#FF9D4D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Files Indexed</p>
          <p className="text-3xl font-extrabold text-white mt-2">{codebase.total_files}</p>
          <p className="text-xs text-gray-500 mt-2">Parsed across workspace repositories</p>
        </div>

        {/* Card 2: Chunks Analyzed */}
        <div className="bg-[#10141B]/60 border border-[#1E2530] p-6 rounded-xl relative overflow-hidden group hover:border-[#FF9D4D]/40 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-opacity">
            <svg className="w-16 h-16 text-[#FF9D4D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Database Chunks</p>
          <p className="text-3xl font-extrabold text-white mt-2">{codebase.total_chunks}</p>
          <p className="text-xs text-gray-500 mt-2">Vector store embeddings cached</p>
        </div>

        {/* Card 3: Code Health */}
        <div className="bg-[#10141B]/60 border border-[#1E2530] p-6 rounded-xl relative overflow-hidden group hover:border-[#FF9D4D]/40 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-opacity">
            <svg className="w-16 h-16 text-[#FF9D4D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Health Score</p>
          <p className="text-3xl font-extrabold text-[#52D3A2] mt-2">{codebase.metrics.health_score}%</p>
          <p className="text-xs text-gray-500 mt-2">Complexity & security aggregation</p>
        </div>

        {/* Card 4: Estimated ROI */}
        <div className="bg-[#10141B]/60 border border-[#1E2530] p-6 rounded-xl relative overflow-hidden group hover:border-[#FF9D4D]/40 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-25 transition-opacity">
            <svg className="w-16 h-16 text-[#FF9D4D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>Developer Hours Saved</span>
            <span
              className="text-gray-600 cursor-help"
              title="Rough heuristic based on indexed chunk volume — not a measured metric."
            >
              (est.)
            </span>
          </p>
          <p className="text-3xl font-extrabold text-white mt-2">~{estimatedHoursSaved} hrs</p>
          <p className="text-xs text-gray-500 mt-2">Heuristic estimate, not a measured value</p>
        </div>
      </div>

      {/* Main Charts & Visuals Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Card: LLM Token Consumption */}
          <div className="bg-[#10141B]/40 border border-[#1E2530] p-6 rounded-xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-semibold text-white">LLM Token Consumption</h3>
                <p className="text-xs text-gray-400">Daily breakdown of model input/output context usage.</p>
              </div>
              <div className="flex space-x-4 text-[10px] font-medium tracking-wide">
                <span className="flex items-center text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF9D4D]/30 border border-[#FF9D4D] mr-1.5"></span>
                  Input Context
                </span>
                <span className="flex items-center text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#52D3A2]/30 border border-[#52D3A2] mr-1.5"></span>
                  Model Response
                </span>
              </div>
            </div>

            {tokens.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-10">No token usage recorded yet.</p>
            ) : (
              /* Custom SVG Time-series Chart */
              <div className="relative">
                <svg className="w-full overflow-visible" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  {/* Horizontal Gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => (
                    <line
                      key={idx}
                      x1={paddingLeft}
                      y1={paddingTop + val * chartHeight}
                      x2={svgWidth - paddingRight}
                      y2={paddingTop + val * chartHeight}
                      stroke="#1E2530"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Left Y Axis Labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => {
                    const labelValue = Math.round(maxTokens - val * maxTokens);
                    return (
                      <text
                        key={idx}
                        x={paddingLeft - 10}
                        y={paddingTop + val * chartHeight + 4}
                        fill="#7B889B"
                        fontSize={9}
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {labelValue >= 1000 ? `${(labelValue / 1000).toFixed(1)}k` : labelValue}
                      </text>
                    );
                  })}

                  {/* Input Tokens Area & Line */}
                  <path d={inputAreaPath} fill="url(#inputGrad)" opacity={0.15} />
                  <polyline fill="none" stroke="#FF9D4D" strokeWidth={2.5} points={inputPoints} />

                  {/* Output Tokens Area & Line */}
                  <path d={outputAreaPath} fill="url(#outputGrad)" opacity={0.15} />
                  <polyline fill="none" stroke="#52D3A2" strokeWidth={2} points={outputPoints} />

                  {/* Interactive Circles / Hover Bars — click or Enter/Space to pin the tooltip */}
                  {tokens.map((t, idx) => {
                    const isActive = activeToken?.date === t.date;
                    return (
                      <g key={idx}>
                        <line
                          x1={getX(idx)}
                          y1={paddingTop}
                          x2={getX(idx)}
                          y2={paddingTop + chartHeight}
                          stroke={isActive ? "rgba(255,157,77,0.4)" : "transparent"}
                          strokeWidth={1.5}
                        />
                        <circle
                          cx={getX(idx)}
                          cy={getY(t.input_tokens)}
                          r={isActive ? 6 : 4}
                          fill="#0A0D12"
                          stroke="#FF9D4D"
                          strokeWidth={2}
                          tabIndex={0}
                          role="button"
                          aria-label={`Input tokens on ${formatDate(t.date, { month: "short", day: "numeric" })}: ${t.input_tokens.toLocaleString()}`}
                          className="cursor-pointer transition-all focus:outline focus:outline-2 focus:outline-[#FF9D4D]"
                          onMouseEnter={() => setHoveredToken(t)}
                          onMouseLeave={() => setHoveredToken(null)}
                          onFocus={() => setHoveredToken(t)}
                          onBlur={() => setHoveredToken(null)}
                          onClick={() => setPinnedToken(pinnedToken?.date === t.date ? null : t)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setPinnedToken(pinnedToken?.date === t.date ? null : t);
                            }
                          }}
                        />
                        <circle
                          cx={getX(idx)}
                          cy={getY(t.output_tokens)}
                          r={isActive ? 5 : 3.5}
                          fill="#0A0D12"
                          stroke="#52D3A2"
                          strokeWidth={1.5}
                          className="cursor-pointer transition-all pointer-events-none"
                        />
                      </g>
                    );
                  })}

                  {/* X Axis Labels (Dates) */}
                  {tokens.map((t, idx) => {
                    if (idx % 3 !== 0 && idx !== tokens.length - 1) return null;
                    const label = formatDate(t.date, { month: "short", day: "numeric" });
                    return (
                      <text
                        key={idx}
                        x={getX(idx)}
                        y={paddingTop + chartHeight + 18}
                        fill="#7B889B"
                        fontSize={9}
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                    );
                  })}

                  <defs>
                    <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF9D4D" />
                      <stop offset="100%" stopColor="#FF9D4D" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#52D3A2" />
                      <stop offset="100%" stopColor="#52D3A2" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Tooltip positioned as a % of SVG width so it scales correctly at any container size */}
                {activeToken && (
                  <div
                    className="absolute bg-[#10141B] border border-[#1E2530] p-3 rounded-lg shadow-2xl backdrop-blur-md transition-all duration-75"
                    style={{
                      left: `${Math.min(
                        Math.max((getX(tokens.indexOf(activeToken)) / svgWidth) * 100, 10),
                        85
                      )}%`,
                      top: "10px",
                      transform: "translateX(-10%)",
                    }}
                  >
                    <p className="text-[10px] font-bold text-[#FF9D4D] tracking-wide mb-1 uppercase">
                      {formatDate(activeToken.date, { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <div className="space-y-1 text-xs">
                      <p className="text-gray-300 flex justify-between space-x-6">
                        <span>Input Context:</span>
                        <span className="font-mono text-white font-bold">{activeToken.input_tokens.toLocaleString()}</span>
                      </p>
                      <p className="text-gray-300 flex justify-between space-x-6">
                        <span>Model Response:</span>
                        <span className="font-mono text-white font-bold">{activeToken.output_tokens.toLocaleString()}</span>
                      </p>
                      <p className="text-[#52D3A2] flex justify-between space-x-6 pt-1 border-t border-[#1E2530]">
                        <span>Requests Made:</span>
                        <span className="font-mono font-bold">{activeToken.requests}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card: Heatmap Workspace Activity */}
          <div className="bg-[#10141B]/40 border border-[#1E2530] p-6 rounded-xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-semibold text-white">Developer Workspace Activity</h3>
                <p className="text-xs text-gray-400">Heatmap tracking audit logs and file modifications over the last 90 days.</p>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-gray-400">
                <span>Less</span>
                <div className="w-2.5 h-2.5 rounded bg-[#161B22]/40 border border-[#1B2129]"></div>
                <div className="w-2.5 h-2.5 rounded bg-[#FF9D4D]/20 border border-[#FF9D4D]/30"></div>
                <div className="w-2.5 h-2.5 rounded bg-[#FF9D4D]/40 border border-[#FF9D4D]/50"></div>
                <div className="w-2.5 h-2.5 rounded bg-[#FF9D4D]/75 border border-[#FF9D4D]/80"></div>
                <div className="w-2.5 h-2.5 rounded bg-[#FF9D4D] border border-[#FF9D4D]"></div>
                <span>More</span>
              </div>
            </div>

            {activity.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-10">No activity recorded yet.</p>
            ) : (
              /* Heatmap Grid rendering — tooltip position is measured from the actual hovered cell,
                 not assumed from a hardcoded column count, so it stays accurate at any wrap width. */
              <div className="relative" ref={heatmapContainerRef}>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-visible">
                  {activity.map((act, index) => (
                    <div
                      key={index}
                      tabIndex={0}
                      role="button"
                      aria-label={`${act.count} events on ${formatDate(act.date, { month: "short", day: "numeric", year: "numeric" })}`}
                      className={`w-[13px] h-[13px] rounded-sm border cursor-pointer transition-all duration-150 focus:outline focus:outline-2 focus:outline-[#FF9D4D] ${getHeatmapColor(act.count)}`}
                      onMouseEnter={(e) => handleActivityEnter(act, e)}
                      onMouseLeave={() => setHoveredActivity(null)}
                      onFocus={(e) => handleActivityEnter(act, e)}
                      onBlur={() => setHoveredActivity(null)}
                    />
                  ))}
                </div>

                {hoveredActivity && activityTooltipPos && (
                  <div
                    className="absolute bg-[#10141B] border border-[#1E2530] px-3 py-1.5 rounded shadow-xl text-[10px] text-white backdrop-blur-md pointer-events-none transform -translate-x-1/2 -translate-y-full whitespace-nowrap"
                    style={{
                      left: `${activityTooltipPos.left}px`,
                      top: `${activityTooltipPos.top - 6}px`,
                    }}
                  >
                    <span className="font-bold text-[#FF9D4D]">{hoveredActivity.count} events</span>{" "}
                    on {formatDate(hoveredActivity.date, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-8">

          {/* Card: Codebase Language Composition */}
          <div className="bg-[#10141B]/40 border border-[#1E2530] p-6 rounded-xl backdrop-blur-md">
            <h3 className="text-base font-semibold text-white mb-2">Language Composition</h3>
            <p className="text-xs text-gray-400 mb-6">Distribution ratios of indexed workspace filetypes.</p>

            <div className="flex flex-col items-center">
              {/* Custom SVG Doughnut chart — segments normalized to sum to 100 regardless of input rounding */}
              <div className="relative w-44 h-44 mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#161B22" strokeWidth="4.2" />

                  {(() => {
                    let offsetAccumulator = 0;
                    return normalizedRatios.map((ratio, index) => {
                      const strokeDash = `${ratio.normalizedValue} ${100 - ratio.normalizedValue}`;
                      const currentOffset = offsetAccumulator;
                      offsetAccumulator += ratio.normalizedValue;

                      return (
                        <circle
                          key={index}
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="transparent"
                          stroke={ratio.color}
                          strokeWidth={hoveredRatio === index ? "5.4" : "4.2"}
                          strokeDasharray={strokeDash}
                          strokeDashoffset={100 - currentOffset}
                          tabIndex={0}
                          role="button"
                          aria-label={`${ratio.name}: ${ratio.value}%`}
                          className="cursor-pointer transition-all duration-200 focus:outline focus:outline-2 focus:outline-white"
                          onMouseEnter={() => setHoveredRatio(index)}
                          onMouseLeave={() => setHoveredRatio(null)}
                          onFocus={() => setHoveredRatio(index)}
                          onBlur={() => setHoveredRatio(null)}
                        />
                      );
                    });
                  })()}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  {hoveredRatio !== null ? (
                    <>
                      <span className="text-base font-extrabold text-white">
                        {codebase.file_ratios[hoveredRatio].value}%
                      </span>
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest truncate max-w-[90px]">
                        {codebase.file_ratios[hoveredRatio].name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-black text-white">{codebase.total_files}</span>
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
                        Total Files
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="w-full space-y-2">
                {codebase.file_ratios.map((ratio, idx) => (
                  <div
                    key={idx}
                    tabIndex={0}
                    role="button"
                    className={`flex justify-between items-center px-2 py-1.5 rounded-lg border transition-all focus:outline focus:outline-1 focus:outline-[#FF9D4D] ${hoveredRatio === idx ? "bg-[#161C26] border-[#FF9D4D]/35" : "border-transparent"}`}
                    onMouseEnter={() => setHoveredRatio(idx)}
                    onMouseLeave={() => setHoveredRatio(null)}
                    onFocus={() => setHoveredRatio(idx)}
                    onBlur={() => setHoveredRatio(null)}
                  >
                    <div className="flex items-center space-x-2 text-xs text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ratio.color }}></span>
                      <span>{ratio.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-white font-sans">{ratio.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Codebase Health Metrics & Symbol analysis */}
          <div className="bg-[#10141B]/40 border border-[#1E2530] p-6 rounded-xl backdrop-blur-md">
            <h3 className="text-base font-semibold text-white mb-2">Codebase Symbol Ratios</h3>
            <p className="text-xs text-gray-400 mb-6">Parsed abstract syntax tree node counts.</p>

            <div className="space-y-4">
              <div className="p-3 bg-[#10141B]/60 border border-[#1E2530] rounded-xl flex justify-between items-center hover:border-[#FF9D4D]/25 transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-[#3178C6]/10 text-[#3178C6]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Classes & Interfaces</p>
                    <p className="text-[10px] text-gray-500">Object-oriented model structures</p>
                  </div>
                </div>
                <span className="font-sans text-sm font-semibold text-gray-300">{codebase.symbols.classes}</span>
              </div>

              <div className="p-3 bg-[#10141B]/60 border border-[#1E2530] rounded-xl flex justify-between items-center hover:border-[#FF9D4D]/25 transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-[#52D3A2]/10 text-[#52D3A2]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Functions & Methods</p>
                    <p className="text-[10px] text-gray-500">Call stack executable units</p>
                  </div>
                </div>
                <span className="font-sans text-sm font-semibold text-gray-300">{codebase.symbols.functions}</span>
              </div>

              <div className="p-3 bg-[#10141B]/60 border border-[#1E2530] rounded-xl flex justify-between items-center hover:border-[#FF9D4D]/25 transition-all">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-[#FF9D4D]/10 text-[#FF9D4D]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Individual Modules</p>
                    <p className="text-[10px] text-gray-500">Source files and entry points</p>
                  </div>
                </div>
                <span className="font-sans text-sm font-semibold text-gray-300">{codebase.symbols.modules}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}