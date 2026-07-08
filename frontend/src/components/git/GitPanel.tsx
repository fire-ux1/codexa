import { useState, useEffect, useCallback } from "react";
import {
  fetchGitStatus,
  fetchGitHistory,
  fetchGitDiff,
  suggestCommitMessage,
  fetchExplainCommit,
  reviewPullRequest,
} from "../../services/git";
import BranchSelector from "./BranchSelector";
import CommitHistory, { GitCommitItem } from "./CommitHistory";
import DiffViewer from "./DiffViewer";
import PRReview from "./PRReview";

const GIT_SUB_TABS = [
  { key: "status", label: "Status & Diffs" },
  { key: "history", label: "Commit History" },
  { key: "pr", label: "Pull Request Review" },
];

interface GitPanelProps {
  repoPath: string;
}

interface GitStatusData {
  active_branch: string;
  branches: string[];
  staged: string[];
  unstaged: string[];
  untracked: string[];
  [key: string]: any;
}

export default function GitPanel({ repoPath }: GitPanelProps) {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<string>("status");

  // Loaders
  const [loading, setLoading] = useState<boolean>(false);
  const [isPRLoading, setIsPRLoading] = useState<boolean>(false);

  // Status & Branch Data
  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [commits, setCommits] = useState<GitCommitItem[]>([]);
  const [diffText, setDiffText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isStagedSelected, setIsStagedSelected] = useState<boolean>(false);

  // Suggested commit message
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [isMsgGenerating, setIsMsgGenerating] = useState<boolean>(false);

  // Commit history selected
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [commitExplanation, setCommitExplanation] = useState<string>("");
  const [isCommitExplaining, setIsCommitExplaining] = useState<boolean>(false);

  // PR Review selection
  const [sourceBranch, setSourceBranch] = useState<string>("");
  const [targetBranch, setTargetBranch] = useState<string>("main");
  const [prReviewData, setPrReviewData] = useState<any>(null);

  // Fetch all initial data
  const loadGitStatusAndHistory = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const statusData = await fetchGitStatus(repoPath);
      setGitStatus(statusData);
      
      // Auto-populate branches and default source branch to active branch
      if (statusData.active_branch) {
        setSourceBranch(statusData.active_branch);
        // Fallback target branch if current is main
        if (statusData.active_branch === "main" || statusData.active_branch === "master") {
          const others = (statusData.branches || []).filter((b: string) => b !== statusData.active_branch);
          if (others.length > 0) setTargetBranch(others[0]);
        }
      }

      const historyData = await fetchGitHistory(repoPath);
      setCommits(historyData.commits || []);
    } catch (err) {
      console.error("[GitPanel] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  // Reset UI selections when the active repo changes
  useEffect(() => {
    setDiffText("");
    setSelectedFile(null);
    setCommitMessage("");
    setPrReviewData(null);
    setSelectedCommitSha(null);
    setCommitExplanation("");
  }, [repoPath]);

  // Load git data when repo changes
  useEffect(() => {
    loadGitStatusAndHistory();
  }, [loadGitStatusAndHistory]);

  // Load a file diff
  const handleSelectFileDiff = async (file: string, staged: boolean) => {
    setSelectedFile(file);
    setIsStagedSelected(staged);
    setDiffText("");
    try {
      const res = await fetchGitDiff(repoPath, staged ? "HEAD" : null);
      if (res.status === "success" && res.diff) {
        const diffLines = res.diff.split("\n");
        const fileDiffLines: string[] = [];
        let capture = false;
        
        for (const line of diffLines) {
          if (line.startsWith("diff --git")) {
            // Check if this diff block matches our file
            capture = line.includes(file);
          }
          if (capture) {
            fileDiffLines.push(line);
          }
        }
        
        setDiffText(fileDiffLines.join("\n") || res.diff);
      }
    } catch (_err) {
      console.error("[GitPanel] File diff error:", _err);
    }
  };

  // Generate Conventional Commit Message
  const handleGenerateCommitMessage = async () => {
    setIsMsgGenerating(true);
    try {
      const res = await suggestCommitMessage(repoPath);
      setCommitMessage(res.commit_message || "");
    } catch {
      setCommitMessage("Failed to generate message.");
    } finally {
      setIsMsgGenerating(false);
    }
  };

  // Select commit to see show/diff output
  const handleSelectCommit = async (sha: string) => {
    setSelectedCommitSha(sha);
    setCommitExplanation("");
    setDiffText("");
    try {
      const res = await fetchGitDiff(repoPath, sha + "~1", sha);
      if (res.status === "success" && res.diff) {
        setDiffText(res.diff);
      }
    } catch (err) {
      console.error("[GitPanel] Commit diff error:", err);
    }
  };

  // Explain commit with AI
  const handleExplainCommit = async (sha: string) => {
    setIsCommitExplaining(true);
    try {
      const res = await fetchExplainCommit(repoPath, sha);
      if (res.status === "success") {
        setCommitExplanation(res.explanation);
      }
    } catch {
      setCommitExplanation("Failed to get explanation.");
    } finally {
      setIsCommitExplaining(false);
    }
  };

  // Trigger PR Review
  const handleRunPRReview = async () => {
    if (!sourceBranch || !targetBranch) return;
    setIsPRLoading(true);
    setPrReviewData(null);
    try {
      const res = await reviewPullRequest(repoPath, sourceBranch, targetBranch);
      if (res.status === "success") {
        setPrReviewData(res);
      }
    } catch (err) {
      console.error("[GitPanel] PR Review error:", err);
    } finally {
      setIsPRLoading(false);
    }
  };

  if (!repoPath) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-xs font-mono select-none">
        Open a repository in explorer to view Git details.
      </div>
    );
  }

  const branches = gitStatus?.branches || [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg text-text">
      {/* Sub-tab header */}
      <div className="flex items-center justify-between border-b border-border bg-panel-alt-2/40 px-4 shrink-0 h-10 select-none">
        <div className="flex items-center gap-0">
          {GIT_SUB_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSubTab(tab.key);
                setDiffText("");
                setSelectedFile(null);
                setSelectedCommitSha(null);
                setCommitExplanation("");
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeSubTab === tab.key
                  ? "border-accent text-accent bg-accent-dim/10"
                  : "border-transparent text-muted hover:text-text-strong hover:bg-panel-alt"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={loadGitStatusAndHistory}
          disabled={loading}
          className="text-muted hover:text-text-strong text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-panel border border-border hover:bg-panel-alt transition-all disabled:opacity-50 select-none shrink-0 cursor-pointer"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Primary body */}
      <div className="flex-grow flex-1 flex min-h-0 overflow-hidden">
        {/* Left column context options */}
        <div className="w-[300px] border-r border-border flex flex-col shrink-0 min-h-0 overflow-hidden bg-bg">
          
          {/* TAB 1: STATUS & DIFFS */}
          {activeSubTab === "status" && (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
              
              {/* Branch metadata */}
              <div className="bg-panel border border-border rounded-xl p-3 space-y-1.5 select-none shadow-sm">
                <span className="text-[9px] font-mono font-bold uppercase text-muted tracking-wider">
                  Active Branch
                </span>
                <p className="text-[11px] font-mono text-text-strong flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success glowing-dot" />
                  {gitStatus?.active_branch || "Loading..."}
                </p>
              </div>

              {/* Staged files */}
              <div className="space-y-1.5 select-none">
                <span className="text-[9px] font-mono font-bold uppercase text-muted tracking-wider">
                  Staged Changes ({gitStatus?.staged?.length || 0})
                </span>
                <div className="space-y-1">
                  {(gitStatus?.staged || []).map((file) => (
                    <button
                      key={file}
                      onClick={() => handleSelectFileDiff(file, true)}
                      className={`w-full text-left px-2 py-1 text-[10px] font-mono rounded truncate block transition-all cursor-pointer ${
                        selectedFile === file && isStagedSelected
                          ? "bg-success-bg/25 text-success border border-success/30"
                          : "text-muted hover:text-text-strong bg-panel border border-transparent"
                      }`}
                    >
                      ✓ {file}
                    </button>
                  ))}
                  {gitStatus?.staged?.length === 0 && (
                    <p className="text-[10px] text-muted italic font-mono pl-2">No staged files.</p>
                  )}
                </div>
              </div>

              {/* Unstaged changes */}
              <div className="space-y-1.5 select-none">
                <span className="text-[9px] font-mono font-bold uppercase text-muted tracking-wider">
                  Unstaged Changes ({gitStatus?.unstaged?.length || 0})
                </span>
                <div className="space-y-1">
                  {(gitStatus?.unstaged || []).map((file) => (
                    <button
                      key={file}
                      onClick={() => handleSelectFileDiff(file, false)}
                      className={`w-full text-left px-2 py-1 text-[10px] font-mono rounded truncate block transition-all cursor-pointer ${
                        selectedFile === file && !isStagedSelected
                          ? "bg-accent-dim/15 text-accent border border-accent/30"
                          : "text-muted hover:text-text-strong bg-panel border border-transparent"
                      }`}
                    >
                      ✎ {file}
                    </button>
                  ))}
                  {gitStatus?.unstaged?.length === 0 && (
                    <p className="text-[10px] text-muted italic font-mono pl-2">No modified files.</p>
                  )}
                </div>
              </div>

              {/* Untracked files */}
              <div className="space-y-1.5 select-none">
                <span className="text-[9px] font-mono font-bold uppercase text-muted tracking-wider">
                  Untracked Files ({gitStatus?.untracked?.length || 0})
                </span>
                <div className="max-h-[140px] overflow-y-auto scrollbar-thin space-y-1">
                  {(gitStatus?.untracked || []).map((file) => (
                    <div
                      key={file}
                      className="px-2 py-1 text-[10px] font-mono rounded truncate bg-panel text-muted border border-border/20"
                    >
                      ? {file}
                    </div>
                  ))}
                  {gitStatus?.untracked?.length === 0 && (
                    <p className="text-[10px] text-muted italic font-mono pl-2">No untracked files.</p>
                  )}
                </div>
              </div>

              {/* AI Commit message generation tool */}
              {gitStatus && gitStatus.staged && gitStatus.staged.length > 0 && (
                <div className="bg-panel border border-border rounded-xl p-3 flex flex-col gap-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold uppercase text-muted tracking-wider">
                      AI Commit Helper
                    </span>
                    <button
                      onClick={handleGenerateCommitMessage}
                      disabled={isMsgGenerating}
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-accent text-bg hover:bg-accent-strong transition-all cursor-pointer"
                    >
                      {isMsgGenerating ? "Writing..." : "Write Message"}
                    </button>
                  </div>
                  {commitMessage && (
                    <textarea
                      readOnly
                      value={commitMessage}
                      className="w-full bg-bg border border-border rounded-lg p-2 text-[10px] text-text font-mono resize-none focus:outline-none h-[64px] shadow-inner"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMMIT HISTORY */}
          {activeSubTab === "history" && (
            <CommitHistory
              commits={commits}
              selectedCommitSha={selectedCommitSha}
              onSelectCommit={handleSelectCommit}
              onExplainCommit={handleExplainCommit}
              isExplaining={isCommitExplaining}
              explanationText={commitExplanation}
            />
          )}

          {/* TAB 3: PR REVIEW SELECTOR */}
          {activeSubTab === "pr" && (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
              <div className="bg-panel border border-border rounded-xl p-4 space-y-4 shadow-md">
                <BranchSelector
                  branches={branches}
                  selected={targetBranch}
                  onChange={setTargetBranch}
                  label="Target Branch (Base)"
                />
                <BranchSelector
                  branches={branches}
                  selected={sourceBranch}
                  onChange={setSourceBranch}
                  label="Source Branch (Compare)"
                />

                <button
                  onClick={handleRunPRReview}
                  disabled={isPRLoading || !sourceBranch || !targetBranch}
                  className="w-full px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg bg-accent text-bg hover:bg-accent-strong transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isPRLoading ? "Analyzing..." : "Review Changes (AI PR Audit)"}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right column Diff rendering pane */}
        <div className="flex-grow flex-1 min-w-0 h-full overflow-hidden">
          {activeSubTab === "pr" ? (
            <PRReview reviewData={prReviewData} isLoading={isPRLoading} />
          ) : (
            <DiffViewer diffText={diffText} filename={selectedFile || selectedCommitSha} />
          )}
        </div>
      </div>
    </div>
  );
}
