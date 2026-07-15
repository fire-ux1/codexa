import React, { useState, useEffect } from "react";
import { Key, Trash2, Plus, Copy, Check, Loader2, Calendar, ShieldAlert } from "lucide-react";
import { createApiKey, fetchApiKeys, revokeApiKey } from "../../services/api";

interface ApiKeyMetadata {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  expires_at: string | null;
}

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create Key Form States
  const [keyName, setKeyName] = useState<string>("");
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const loadKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApiKeys();
      setKeys(
        data.map((k: any) => ({
          id: k.id,
          name: k.name,
          prefix: k.prefix || k.key?.substring(0, 8) || "cp_key",
          created_at: k.created_at,
          expires_at: k.expires_at || null,
        }))
      );
    } catch (err: any) {
      console.error("Error fetching API keys:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to retrieve API keys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      setIsCreating(true);
      setError(null);
      const res = await createApiKey(keyName, expiresInDays);
      setNewKeyPlain(res.key || (res as any).api_key || null);
      setKeyName("");
      // Refresh list
      loadKeys();
    } catch (err: any) {
      console.error("Error generating API key:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to generate API key.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? External applications using it will lose access immediately.")) {
      return;
    }

    try {
      setError(null);
      await revokeApiKey(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err: any) {
      console.error("Error revoking API key:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to revoke API key.");
    }
  };

  const copyToClipboard = () => {
    if (!newKeyPlain) return;
    navigator.clipboard.writeText(newKeyPlain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5 text-left font-sans select-text">
      
      {/* Tab Header */}
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Key className="w-4 h-4 text-[#FF9D4D]" />
          <span>Personal API Keys</span>
        </h3>
        <p className="text-[10px] text-gray-500">
          Create and manage API keys to authenticate external integrations with CodePilot AI.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10.5px] font-mono flex items-start gap-2 select-text">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Creation Plaintext Overlay */}
      {newKeyPlain && (
        <div className="p-4 bg-[#FF9D4D]/10 border border-[#FF9D4D]/20 rounded-2xl space-y-3 relative overflow-hidden glass animate-fade-in select-text">
          <div className="absolute top-2 right-2">
            <button
              onClick={() => setNewKeyPlain(null)}
              className="text-gray-500 hover:text-white font-mono text-xs cursor-pointer px-2 py-0.5 rounded hover:bg-[#1c2230]"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-[#FFB073] uppercase tracking-wide">Key Generated Successfully</h4>
            <p className="text-[9.5px] text-gray-400">
              Copy this API key now. For security reasons, you will **not** be able to see it again.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#0c0f16] border border-[#222834] p-2 rounded-xl">
            <code className="text-xs text-white font-mono flex-grow select-all break-all pr-2">
              {newKeyPlain}
            </code>
            <button
              onClick={copyToClipboard}
              className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                copied ? "bg-emerald-500/15 text-emerald-400" : "bg-[#141822] hover:bg-[#1b212f] text-gray-400 hover:text-white"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Create key form */}
      <form onSubmit={handleCreateKey} className="bg-[#10141B] border border-[#1c2230] p-4 rounded-2xl space-y-4">
        <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Generate New Key</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500">Key Name</label>
            <input
              type="text"
              required
              placeholder="e.g. CI/CD integration key"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0C0F16] border border-[#1c2230] rounded-xl text-xs font-sans text-white placeholder-gray-600 focus:outline-none focus:border-[#FF9D4D]/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500">Expiration</label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 bg-[#0C0F16] border border-[#1c2230] rounded-xl text-xs font-sans text-white focus:outline-none focus:border-[#FF9D4D]/50 cursor-pointer"
            >
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>365 Days</option>
              <option value={0}>Never Expires</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isCreating || !keyName.trim()}
            className="px-4 py-1.5 bg-[#FF9D4D] hover:bg-[#FFB073] disabled:opacity-50 text-[#0A0D12] font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#FF9D4D]/5"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Create Key</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Keys List */}
      <div className="space-y-3.5">
        <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Active Keys ({keys.length})</h4>
        
        {loading ? (
          <div className="py-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            <span className="text-[10px] font-mono">Loading API keys...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="py-8 text-center text-gray-500 border border-dashed border-[#1c2230] rounded-2xl flex flex-col items-center justify-center gap-2">
            <Key className="w-6 h-6 text-gray-600 opacity-50" />
            <p className="text-xs font-sans">No API keys created yet.</p>
          </div>
        ) : (
          <div className="border border-[#1c2230] rounded-2xl overflow-hidden divide-y divide-[#1c2230] bg-[#10141B]/40">
            {keys.map((key) => (
              <div key={key.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#141822]/40 transition-colors">
                <div className="space-y-1 min-w-0">
                  <div className="font-bold text-white text-xs truncate font-sans">{key.name}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9.5px] font-mono text-gray-500">
                    <span className="bg-[#0c0f16] px-1.5 py-0.5 rounded border border-[#222834] text-gray-400 font-semibold select-all">
                      {key.prefix}...
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      <span>Created: {formatDate(key.created_at)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      <span>Expires: {formatDate(key.expires_at)}</span>
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="p-2 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
                  title="Revoke API key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
