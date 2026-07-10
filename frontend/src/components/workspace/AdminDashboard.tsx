import { useState, useEffect, useCallback } from "react";
import { Users, FileText, Search, ArrowLeft, ArrowRight, Download, Shield, Loader2, RefreshCw, Key } from "lucide-react";
import { fetchProjectMembers, updateMemberRole, fetchAuditLogs } from "../../services/api";

interface Member {
  project_id: string;
  project_name: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  project_id: string | null;
  details: string;
  ip_address: string | null;
  created_at: string;
}

interface AdminDashboardProps {
  repoPath: string;
  repoId: string | number | null;
  onBack: () => void;
}

export default function AdminDashboard({ repoPath, repoId, onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"members" | "audit" | "permissions">("members");
  const [error, setError] = useState<string | null>(null);

  // Members States
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  // Audit Logs States
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(0);
  const [hasMoreLogs, setHasMoreLogs] = useState<boolean>(true);
  const LOGS_LIMIT = 25;

  const repositoryIdentifier = String(repoId || repoPath);

  // Load Members
  const loadMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      setError(null);
      const data = await fetchProjectMembers(repositoryIdentifier);
      setMembers(data);
    } catch (err: any) {
      console.error("Error loading project members:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load project members.");
    } finally {
      setLoadingMembers(false);
    }
  }, [repositoryIdentifier]);

  // Load Audit Logs
  const loadLogs = useCallback(async (pageNum = 0, query = "") => {
    try {
      setLoadingLogs(true);
      setError(null);
      const offset = pageNum * LOGS_LIMIT;
      const data = await fetchAuditLogs(repositoryIdentifier, LOGS_LIMIT, offset, query);
      setLogs(data);
      setHasMoreLogs(data.length === LOGS_LIMIT);
    } catch (err: any) {
      console.error("Error loading audit logs:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load audit logs.");
    } finally {
      setLoadingLogs(false);
    }
  }, [repositoryIdentifier]);

  useEffect(() => {
    if (activeTab === "members") {
      loadMembers();
    } else {
      loadLogs(page, searchQuery);
    }
  }, [activeTab, page, loadMembers, loadLogs]);

  // Handle Role Change
  const handleRoleChange = async (member: Member, newRole: string) => {
    if (member.role === newRole) return;
    
    try {
      setUpdatingRoleFor(member.user_id);
      setError(null);
      await updateMemberRole(repositoryIdentifier, member.project_id, member.user_id, newRole);
      
      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.user_id === member.user_id ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      console.error("Error updating member role:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to update member role.");
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadLogs(0, searchQuery);
  };

  // Download CSV
  const downloadCSV = () => {
    if (logs.length === 0) return;

    const headers = ["ID", "Timestamp", "User Name", "User Email", "Action", "IP Address", "Details"];
    const rows = logs.map((log) => [
      log.id,
      log.created_at,
      log.user_name || "Unknown",
      log.user_email || "N/A",
      log.action,
      log.ip_address || "N/A",
      log.details.replace(/"/g, '""'),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("delete") || act.includes("revoke") || act.includes("fail") || act.includes("reject")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (act.includes("create") || act.includes("apply") || act.includes("save") || act.includes("login")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (act.includes("update") || act.includes("edit") || act.includes("index")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1219] text-text select-text overflow-hidden font-sans">
      
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-[#1c2230] bg-[#0c0f16] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-[#1c2230] hover:bg-[#141822] text-muted hover:text-white cursor-pointer transition-colors"
            title="Go back to workspace"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase font-mono">
              <Shield className="w-4 h-4 text-[#FF9D4D]" />
              <span>Admin Panel: RBAC & Audit Trails</span>
            </h2>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
              Repository: {repoPath.split(/[/\\]/).pop()}
            </p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex bg-[#0c0f16] border border-[#1c2230] p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveTab("members");
              setError(null);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "members" ? "bg-[#FF9D4D]/15 text-[#FF9D4D]" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("audit");
              setError(null);
              setPage(0);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "audit" ? "bg-[#FF9D4D]/15 text-[#FF9D4D]" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("permissions");
              setError(null);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "permissions" ? "bg-[#FF9D4D]/15 text-[#FF9D4D]" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Role Permissions</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow p-6 overflow-y-auto min-h-0 relative select-text">
        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-mono flex items-center justify-between gap-3 select-text">
            <span>{error}</span>
            <button
              onClick={activeTab === "members" ? loadMembers : () => loadLogs(page, searchQuery)}
              className="p-1.5 hover:bg-rose-500/20 rounded-lg cursor-pointer transition-colors text-rose-300 flex items-center gap-1 font-mono text-[10px]"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Tab 1: TEAM MEMBERS */}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c2230]/40 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Members Matrix</h3>
              <p className="text-[10px] text-gray-500">Configure workspace access levels for project developers.</p>
            </div>

            {loadingMembers ? (
              <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-[#FF9D4D] animate-spin" />
                <span className="text-xs font-mono animate-pulse">Loading members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-16 text-center text-gray-500 border border-dashed border-[#1c2230] rounded-2xl flex flex-col items-center justify-center gap-3">
                <Users className="w-8 h-8 text-gray-600 opacity-55 animate-pulse" />
                <p className="text-xs font-sans">No project members found.</p>
              </div>
            ) : (
              <div className="border border-[#1c2230] rounded-2xl overflow-hidden divide-y divide-[#1c2230] bg-[#10141B]/40">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-[#141822]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={member.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.email}`}
                        alt={member.name}
                        className="w-9 h-9 rounded-xl bg-[#0c0f16] border border-[#222834] shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-white text-xs truncate">{member.name}</div>
                        <div className="text-[10px] font-mono text-gray-500 truncate">{member.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-[9.5px] font-mono text-gray-500 bg-[#0c0f16] border border-[#1c2230] px-2 py-0.5 rounded-lg shrink-0">
                        Project: {member.project_name}
                      </span>

                      <div className="relative shrink-0 select-none">
                        <select
                          value={member.role}
                          disabled={updatingRoleFor === member.user_id}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                          className="bg-[#0c0f16] border border-[#1c2230] text-gray-300 text-[10px] font-mono font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#FF9D4D]/50 cursor-pointer disabled:opacity-50"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        {updatingRoleFor === member.user_id && (
                          <div className="absolute inset-0 bg-[#0c0f16]/80 flex items-center justify-center rounded-lg">
                            <Loader2 className="w-3.5 h-3.5 text-[#FF9D4D] animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c2230]/40 pb-4 shrink-0 select-none">
              <form onSubmit={handleSearchSubmit} className="relative flex-grow max-w-sm">
                <input
                  type="text"
                  placeholder="Filter logs by action or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#0c0f16] border border-[#1c2230] rounded-xl text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#FF9D4D]/50"
                />
                <Search className="w-3.5 h-3.5 text-gray-600 absolute left-3 top-2.5" />
              </form>

              <button
                onClick={downloadCSV}
                disabled={logs.length === 0 || loadingLogs}
                className="px-4 py-1.5 bg-[#141822] hover:bg-[#1b212f] disabled:opacity-50 text-gray-400 hover:text-white border border-[#1c2230] rounded-xl text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {loadingLogs ? (
              <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-[#FF9D4D] animate-spin" />
                <span className="text-xs font-mono animate-pulse">Querying database logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-gray-500 border border-dashed border-[#1c2230] rounded-2xl flex flex-col items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-gray-600 opacity-55 animate-pulse" />
                <p className="text-xs font-sans">No audit events match your query.</p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Table */}
                <div className="border border-[#1c2230] rounded-2xl overflow-x-auto bg-[#10141B]/40">
                  <table className="w-full border-collapse text-left font-mono text-[10.5px]">
                    <thead>
                      <tr className="border-b border-[#1c2230] bg-[#0c0f16]/60 text-gray-500 uppercase tracking-wider text-[9px] font-bold">
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">User</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">IP Address</th>
                        <th className="p-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2230]">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#141822]/40 transition-colors">
                          <td className="p-3 whitespace-nowrap text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="font-bold text-white">{log.user_name || "Unknown"}</div>
                            <div className="text-[9px] text-gray-600 mt-0.5">{log.user_email || "N/A"}</div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wider ${getActionBadgeColor(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-gray-400">
                            {log.ip_address || "127.0.0.1"}
                          </td>
                          <td className="p-3 break-all max-w-[280px] text-gray-300 leading-normal select-all">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-2 select-none">
                  <span className="text-[10px] text-gray-500 font-mono">
                    Page {page + 1}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-1.5 rounded-lg border border-[#1c2230] bg-[#0c0f16] hover:bg-[#141822] text-muted hover:text-white disabled:opacity-30 cursor-pointer transition-all"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMoreLogs}
                      className="p-1.5 rounded-lg border border-[#1c2230] bg-[#0c0f16] hover:bg-[#141822] text-muted hover:text-white disabled:opacity-30 cursor-pointer transition-all"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Tab 3: ROLE PERMISSIONS */}
        {activeTab === "permissions" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Permissions Matrix</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-[#1c2230] bg-[#10141B]/40 text-xs font-mono">
                <thead className="bg-[#0c0f16]/60 text-gray-500 uppercase tracking-wider">
                  <tr className="border-b border-[#1c2230]">
                    <th className="p-2 text-left">Capability</th>
                    <th className="p-2 text-center">Owner</th>
                    <th className="p-2 text-center">Admin</th>
                    <th className="p-2 text-center">Member</th>
                    <th className="p-2 text-center">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2230]">
                  {[
                    { capability: "Create Project", owner: true, admin: true, member: false, viewer: false },
                    { capability: "Delete Project", owner: true, admin: false, member: false, viewer: false },
                    { capability: "Manage Members", owner: true, admin: true, member: false, viewer: false },
                    { capability: "View Audit Logs", owner: true, admin: true, member: true, viewer: true },
                    { capability: "Edit Code", owner: true, admin: true, member: true, viewer: false },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#141822]/30">
                      <td className="p-2 font-medium text-white">{row.capability}</td>
                      <td className="p-2 text-center">{row.owner ? "✔" : "—"}</td>
                      <td className="p-2 text-center">{row.admin ? "✔" : "—"}</td>
                      <td className="p-2 text-center">{row.member ? "✔" : "—"}</td>
                      <td className="p-2 text-center">{row.viewer ? "✔" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
