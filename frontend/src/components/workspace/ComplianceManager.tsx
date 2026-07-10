import React, { useState, useEffect } from "react";
import { ShieldCheck, Calendar, Clock, Loader2, Save } from "lucide-react";
import { fetchComplianceSettings, updateComplianceSettings } from "../../services/api";

export default function ComplianceManager() {
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compliance Policy States
  const [hipaaMode, setHipaaMode] = useState<boolean>(false);
  const [soxMode, setSoxMode] = useState<boolean>(false);
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [sessionTimeout, setSessionTimeout] = useState<boolean>(true);

  // Connection settings states (to be updated by integrations too, but saved in same record)
  const [slackEnabled, setSlackEnabled] = useState<boolean>(false);
  const [jiraEnabled, setJiraEnabled] = useState<boolean>(false);
  const [githubEntEnabled, setGithubEntEnabled] = useState<boolean>(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchComplianceSettings();
      setHipaaMode(!!data.hipaa_mode);
      setSoxMode(!!data.sox_mode);
      setRetentionDays(data.retention_days || 90);
      setSessionTimeout(!!data.session_timeout);
      
      setSlackEnabled(!!data.slack_enabled);
      setJiraEnabled(!!data.jira_enabled);
      setGithubEntEnabled(!!data.github_ent_enabled);
    } catch (err: any) {
      console.error("Failed to load compliance settings:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to retrieve compliance configurations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMsg(null);
      
      await updateComplianceSettings({
        hipaa_mode: hipaaMode,
        sox_mode: soxMode,
        retention_days: retentionDays,
        session_timeout: sessionTimeout,
        slack_enabled: slackEnabled,
        jira_enabled: jiraEnabled,
        github_ent_enabled: githubEntEnabled,
      });

      setSuccessMsg("Compliance settings saved successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Error saving compliance settings:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to save compliance configurations.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
        <span className="text-[10px] font-mono">Loading compliance policies...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 text-left font-sans select-text">
      
      {/* Header */}
      <div className="border-b border-[#1c2230]/40 pb-2 select-none">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#FF9D4D]" />
          <span>Compliance Policies & IT Controls</span>
        </h3>
        <p className="text-[10px] text-gray-500">
          Enforce data isolation protocols, audit controls, and session duration restrictions.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10.5px] font-mono select-text">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10.5px] font-mono select-none">
          {successMsg}
        </div>
      )}

      <div className="space-y-4">
        
        {/* Toggle Toggles */}
        <div className="bg-[#10141B] border border-[#1c2230] p-4 rounded-2xl space-y-4">
          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono select-none">Operational Directives</h4>

          {/* HIPAA */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <label className="text-xs font-bold text-white cursor-pointer select-none" htmlFor="hipaa-mode">
                HIPAA Isolation Mode
              </label>
              <p className="text-[9.5px] text-gray-500 leading-normal">
                Restricts diagnostic output payloads and masks sensitive customer data to guarantee healthcare privacy.
              </p>
            </div>
            <input
              type="checkbox"
              id="hipaa-mode"
              checked={hipaaMode}
              onChange={(e) => setHipaaMode(e.target.checked)}
              className="w-8 h-4 rounded bg-[#0c0f16] border border-[#1c2230] text-[#FF9D4D] focus:ring-0 cursor-pointer shrink-0 mt-1 accent-[#FF9D4D]"
            />
          </div>

          <div className="border-t border-[#1c2230]/40 my-2" />

          {/* SOX */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              <label className="text-xs font-bold text-white cursor-pointer select-none" htmlFor="sox-mode">
                SOX Compliance Auditing
              </label>
              <p className="text-[9.5px] text-gray-500 leading-normal">
                Enforces cryptographically signed audit logs of all configuration snapshots, API keys, and workspace modifications.
              </p>
            </div>
            <input
              type="checkbox"
              id="sox-mode"
              checked={soxMode}
              onChange={(e) => setSoxMode(e.target.checked)}
              className="w-8 h-4 rounded bg-[#0c0f16] border border-[#1c2230] text-[#FF9D4D] focus:ring-0 cursor-pointer shrink-0 mt-1 accent-[#FF9D4D]"
            />
          </div>
        </div>

        {/* Configurations */}
        <div className="bg-[#10141B] border border-[#1c2230] p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Retention Period */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Audit Log Retention</span>
            </label>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 bg-[#0C0F16] border border-[#1c2230] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF9D4D]/50 cursor-pointer"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={180}>180 Days</option>
              <option value={365}>365 Days</option>
              <option value={9999}>Indefinite Retention</option>
            </select>
          </div>

          {/* Session Expiration */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Session Controls</span>
            </label>
            <div className="flex items-center justify-between bg-[#0C0F16] border border-[#1c2230] px-3 h-8.5 rounded-xl">
              <span className="text-xs text-gray-300 select-none">Auto-Logout Idle Sessions</span>
              <input
                type="checkbox"
                checked={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.checked)}
                className="w-4 h-4 text-[#FF9D4D] bg-[#0c0f16] border border-[#1c2230] rounded cursor-pointer accent-[#FF9D4D]"
              />
            </div>
          </div>

        </div>

      </div>

      {/* Save Button */}
      <div className="flex justify-end select-none">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-1.5 bg-[#FF9D4D] hover:bg-[#FFB073] disabled:opacity-50 text-[#0A0D12] font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#FF9D4D]/5"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Policies</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
}
