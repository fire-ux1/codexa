import React, { useState, useEffect } from "react";
import { Sliders, MessageSquare, Ticket, Loader2, Save, ExternalLink } from "lucide-react";
import { fetchComplianceSettings, updateComplianceSettings } from "../../services/api";

const GithubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

export default function IntegrationsManager() {
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Integration States
  const [slackEnabled, setSlackEnabled] = useState<boolean>(false);
  const [jiraEnabled, setJiraEnabled] = useState<boolean>(false);
  const [githubEntEnabled, setGithubEntEnabled] = useState<boolean>(false);

  // Hidden Compliance values (need to send these so they aren't overwritten)
  const [hipaaMode, setHipaaMode] = useState<boolean>(false);
  const [soxMode, setSoxMode] = useState<boolean>(false);
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [sessionTimeout, setSessionTimeout] = useState<boolean>(true);

  // Detail configuration inputs
  const [slackWebhook, setSlackWebhook] = useState<string>("");
  const [jiraInstance, setJiraInstance] = useState<string>("https://codepilot-workspace.atlassian.net");

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchComplianceSettings();
      setSlackEnabled(!!data.slack_enabled);
      setJiraEnabled(!!data.jira_enabled);
      setGithubEntEnabled(!!data.github_ent_enabled);

      // Save compliance state
      setHipaaMode(!!data.hipaa_mode);
      setSoxMode(!!data.sox_mode);
      setRetentionDays(data.retention_days || 90);
      setSessionTimeout(!!data.session_timeout);
    } catch (err: any) {
      console.error("Failed to load integrations settings:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to retrieve third-party integration settings.");
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

      setSuccessMsg("Integrations saved successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Error saving integrations settings:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to update integrations.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
        <span className="text-[10px] font-mono">Loading active integrations...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 text-left font-sans select-text">
      
      {/* Header */}
      <div className="border-b border-[#1c2230]/40 pb-2 select-none">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-[#FF9D4D]" />
          <span>Connected Workspace Integrations</span>
        </h3>
        <p className="text-[10px] text-gray-500">
          Sync notifications, file tasks, and access self-hosted enterprise repositories.
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
        
        {/* SLACK CARD */}
        <div className={`p-4 rounded-2xl border transition-all ${
          slackEnabled ? "bg-purple-950/5 border-purple-500/20" : "bg-[#10141B] border-[#1c2230]"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span>Slack Webhook Alerts</span>
                </h4>
                <p className="text-[9.5px] text-gray-500 leading-normal max-w-md">
                  Send automated notifications to your channels when indexing operations complete or security policies trigger.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={slackEnabled}
              onChange={(e) => setSlackEnabled(e.target.checked)}
              className="w-8 h-4 rounded bg-[#0c0f16] border border-[#1c2230] text-purple-500 focus:ring-0 cursor-pointer shrink-0 accent-purple-500 mt-1"
            />
          </div>
          
          {slackEnabled && (
            <div className="mt-3 pt-3 border-t border-purple-500/10 space-y-1.5">
              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-400">Webhook Endpoint URL</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0C0F16] border border-purple-500/20 rounded-xl text-xs font-mono text-gray-300 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>

        {/* JIRA CARD */}
        <div className={`p-4 rounded-2xl border transition-all ${
          jiraEnabled ? "bg-blue-950/5 border-blue-500/20" : "bg-[#10141B] border-[#1c2230]"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white font-mono">Jira Ticket Syncer</h4>
                <p className="text-[9.5px] text-gray-500 leading-normal max-w-md">
                  Automatically export code review bugs, test failures, and refactoring items as Jira tasks.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={jiraEnabled}
              onChange={(e) => setJiraEnabled(e.target.checked)}
              className="w-8 h-4 rounded bg-[#0c0f16] border border-[#1c2230] text-blue-500 focus:ring-0 cursor-pointer shrink-0 accent-blue-500 mt-1"
            />
          </div>

          {jiraEnabled && (
            <div className="mt-3 pt-3 border-t border-blue-500/10 space-y-1.5">
              <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-blue-400">Jira Instance URL</label>
              <input
                type="text"
                value={jiraInstance}
                onChange={(e) => setJiraInstance(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0C0F16] border border-blue-500/20 rounded-xl text-xs font-mono text-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* GITHUB ENTERPRISE CARD */}
        <div className={`p-4 rounded-2xl border transition-all ${
          githubEntEnabled ? "bg-[#FF9D4D]/5 border-[#FF9D4D]/20" : "bg-[#10141B] border-[#1c2230]"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF9D4D]/10 border border-[#FF9D4D]/20 flex items-center justify-center text-[#FF9D4D] shrink-0">
                <GithubIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white font-mono">GitHub Enterprise Server</h4>
                <p className="text-[9.5px] text-gray-500 leading-normal max-w-md">
                  Integrate local, self-hosted GitHub Enterprise servers instead of github.com cloud networks.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={githubEntEnabled}
              onChange={(e) => setGithubEntEnabled(e.target.checked)}
              className="w-8 h-4 rounded bg-[#0c0f16] border border-[#1c2230] text-[#FF9D4D] focus:ring-0 cursor-pointer shrink-0 accent-[#FF9D4D] mt-1"
            />
          </div>

          {githubEntEnabled && (
            <div className="mt-3 pt-3 border-t border-[#FF9D4D]/10 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-mono">OAuth Credential Token Authorized</span>
              <button
                type="button"
                className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#FF9D4D] hover:text-[#FFB073] flex items-center gap-1 cursor-pointer"
              >
                <span>Re-authenticate</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
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
              <span>Saving Configurations...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Integrations</span>
            </>
          )}
        </button>
      </div>

    </form>
  );
}
