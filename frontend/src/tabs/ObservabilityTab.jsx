import { useState, useEffect } from "react";
import { fetchObservabilityMetrics } from "../services/api";
import SkeletonLoader from "../components/common/SkeletonLoader";

export default function ObservabilityTab() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await fetchObservabilityMetrics();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError("Failed to load telemetry statistics.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
    // Poll every 10 seconds to keep stats alive
    const timer = setInterval(loadMetrics, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="space-y-6 p-2">
        <div className="h-4 w-1/4 bg-white/5 rounded animate-pulse"></div>
        <SkeletonLoader type="metrics" count={4} />
        <SkeletonLoader type="list" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-rose-400 font-mono text-xs">
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in w-full pb-4">
      {/* Header */}
      <div className="border-b border-white/5 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          📊 Telemetry &amp; System Observability
        </h2>
        <p className="text-[10px] text-gray-500 font-mono leading-relaxed mt-0.5">
          Real-time API performance stats, token monitoring, caching ratios, and request latency benchmarks.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Latency */}
        <div className="p-4 rounded-xl border border-white/5 bg-black/20 text-left">
          <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600 block">Avg Response</span>
          <span className="text-white text-md font-bold font-mono block mt-1">
            {metrics.average_latency}s
          </span>
        </div>
        {/* Cache Hit */}
        <div className="p-4 rounded-xl border border-white/5 bg-black/20 text-left">
          <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600 block">Cache Hit Rate</span>
          <span className="text-indigo-400 text-md font-bold font-mono block mt-1">
            {metrics.cache_hit_rate}%
          </span>
        </div>
        {/* Token count */}
        <div className="p-4 rounded-xl border border-white/5 bg-black/20 text-left">
          <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600 block">Total Tokens</span>
          <span className="text-purple-400 text-md font-bold font-mono block mt-1">
            {metrics.token_usage.toLocaleString()}
          </span>
        </div>
        {/* Total requests */}
        <div className="p-4 rounded-xl border border-white/5 bg-black/20 text-left">
          <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600 block">AI Requests</span>
          <span className="text-emerald-400 text-md font-bold font-mono block mt-1">
            {metrics.total_ai_requests}
          </span>
        </div>
        {/* Error rate */}
        <div className="p-4 rounded-xl border border-white/5 bg-black/20 text-left">
          <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600 block">Error Rate</span>
          <span className={`text-md font-bold font-mono block mt-1 ${metrics.error_rate > 5 ? 'text-rose-400' : 'text-gray-400'}`}>
            {metrics.error_rate}%
          </span>
        </div>
        {/* Repos */}
        <div className="p-4 rounded-xl border border-white/5 bg-black/20 text-left">
          <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600 block">Indexed Repos</span>
          <span className="text-white text-md font-bold font-mono block mt-1">
            {metrics.indexed_repositories}
          </span>
        </div>
        {/* Users */}
        <div className="p-4 rounded-xl border border-white/5 bg-black/20 text-left col-span-2 lg:col-span-1">
          <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600 block">Active Users</span>
          <span className="text-white text-md font-bold font-mono block mt-1">
            {metrics.active_users}
          </span>
        </div>
      </div>

      {/* Recent Logs Table */}
      <div className="rounded-xl border border-white/5 bg-black/10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 bg-white/2 shrink-0">
          <h3 className="text-[10px] uppercase font-mono font-bold tracking-widest text-gray-500">
            Recent System Event Logs
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[10px] text-gray-400">
            <thead>
              <tr className="border-b border-white/5 bg-black/40 text-gray-600">
                <th className="px-4 py-2 font-bold uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-2 font-bold uppercase tracking-wider">Event Type</th>
                <th className="px-4 py-2 font-bold uppercase tracking-wider">Latency</th>
                <th className="px-4 py-2 font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 font-bold uppercase tracking-wider">Diagnostics</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recent_logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-600 italic">
                    No logged telemetry events found in current session.
                  </td>
                </tr>
              ) : (
                metrics.recent_logs.map((log, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/1.5 transition-all">
                    <td className="px-4 py-2">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="px-4 py-2">
                      <span className="text-white font-bold">{log.event_type}</span>
                    </td>
                    <td className="px-4 py-2">{log.latency > 0 ? `${log.latency.toFixed(3)}s` : "-"}</td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        log.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-rose-500/10 text-rose-400 border border-rose-500/10"
                      }`}>
                        {log.success ? "SUCCESS" : "FAILED"}
                      </span>
                    </td>
                    <td className="px-4 py-2 truncate max-w-[200px]" title={log.error_message || "None"}>
                      {log.error_message || <span className="text-gray-700 italic">None</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
