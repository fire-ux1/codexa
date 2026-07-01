/* eslint-disable react-hooks/set-state-in-effect */
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
import CommitHistory from "./CommitHistory";
import DiffViewer from "./DiffViewer";
import PRReview from "./PRReview";

const GIT_SUB_TABS = [
  { key: "status", label: "Status & Diffs" },
  { key: "history", label: "Commit History" },
  { key: "pr", label: "Pull Request Review" },
];

export default function GitPanel({ repoPath }) {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState("status");

  // Loaders
  const [loading, setLoading] = useState(false);
  const [isPRLoading, setIsPRLoading] = useState(false);

  // Status & Branch Data
  const [gitStatus, setGitStatus] = useState(null);
  const [commits, setCommits] = useState([]);
  const [diffText, setDiffText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isStagedSelected, setIsStagedSelected] = useState(false);

  // Suggested commit message
  const [commitMessage, setCommitMessage] = useState("");
  const [isMsgGenerating, setIsMsgGenerating] = useState(false);

  // Commit history selected
  const [selectedCommitSha, setSelectedCommitSha] = useState(null);
  const [commitExplanation, setCommitExplanation] = useState("");
  const [isCommitExplaining, setIsCommitExplaining] = useState(false);

  // PR Review selection
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");
  const [prReviewData, setPrReviewData] = useState(null);

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
          const others = (statusData.branches || []).filter(b => b !== statusData.active_branch);
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
  const handleSelectFileDiff = async (file, staged) => {
    setSelectedFile(file);
    setIsStagedSelected(staged);
    setDiffText("");
    try {
      // If staged, target="HEAD", source is None.
      // If unstaged, target=None, source is None. But we want diff of that specific file!
      // GitPython diff accepts file paths via custom git commands, but for simplicity, we can fetch
      // full diff or let the backend filter. Since we have a full diff, let's just get target diff.
      const res = await fetchGitDiff(repoPath, staged ? "HEAD" : null);
      if (res.status === "success") {
        // filter diff lines for this file path if needed, or show the target diff.
        // The backend returns the overall git diff. Let's filter the diff text for the target file
        const diffLines = res.diff.split("\n");
        const fileDiffLines = [];
        let capture = false;
        
        for (const line of diffLines) {
          if (line.startsWith("diff --git")) {
            // Check if this diff block matches our file
            capture = line.includes(file);
          }
          if (capture) {
            fileDiffLines.append ? fileDiffLines.push(line) : fileDiffLines.push(line);
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
  const handleSelectCommit = async (sha) => {
    setSelectedCommitSha(sha);
    setCommitExplanation("");
    setDiffText("");
    try {
      const res = await fetchGitDiff(repoPath, sha + "~1", sha);
      if (res.status === "success") {
        setDiffText(res.diff);
      }
    } catch (err) {
      console.error("[GitPanel] Commit diff error:", err);
    }
  };

  // Explain commit with AI
  const handleExplainCommit = async (sha) => {
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
      <div className="flex items-center justify-center h-full text-gray-600 text-xs font-mono select-none">
        Open a repository in explorer to view Git details.
      </div>
    );
  }

  const branches = gitStatus?.branches || [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#07090f] text-gray-300">
      {/* Sub-tab header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#090c14] px-4 shrink-0 h-9">
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
              className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeSubTab === tab.key
                  ? "border-violet-500 text-violet-400 bg-violet-500/5"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/3"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={loadGitStatusAndHistory}
          disabled={loading}
          className="text-gray-500 hover:text-gray-300 text-[10px] font-mono font-bold px-2 py-1 rounded bg-white/5 border border-white/8 hover:bg-white/8 transition-all disabled:opacity-50 select-none shrink-0"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Primary body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left column context options */}
        <div className="w-[300px] border-r border-white/5 flex flex-col shrink-0 min-h-0 overflow-hidden">
          
          {/* TAB 1: STATUS & DIFFS */}
          {activeSubTab === "status" && (
            <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
              
              {/* Branch metadata */}
              <div className="bg-white/3 border border-white/5 rounded-xl p-3 space-y-1.5 select-none">
                <span className="text-[9px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                  Active Branch
                </span>
                <p className="text-[11px] font-mono text-gray-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {gitStatus?.active_branch || "Loading..."}
                </p>
              </div>

              {/* Staged files */}
              <div className="space-y-1.5 select-none">
                <span className="text-[9px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                  Staged Changes ({gitStatus?.staged?.length || 0})
                </span>
                <div className="space-y-1">
                  {(gitStatus?.staged || []).map((file) => (
                    <button
                      key={file}
                      onClick={() => handleSelectFileDiff(file, true)}
                      className={`w-full text-left px-2 py-1 text-[10px] font-mono rounded truncate block transition-all ${
                        selectedFile === file && isStagedSelected
                          ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                          : "text-gray-400 hover:text-gray-200 bg-white/3 border border-transparent"
                      }`}
                    >
                      ✓ {file}
                    </button>
                  ))}
                  {gitStatus?.staged?.length === 0 && (
                    <p className="text-[10px] text-gray-600 italic font-mono pl-2">No staged files.</p>
                  )}
                </div>
              </div>

              {/* Unstaged changes */}
              <div className="space-y-1.5 select-none">
                <span className="text-[9px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                  Unstaged Changes ({gitStatus?.unstaged?.length || 0})
                </span>
                <div className="space-y-1">
                  {(gitStatus?.unstaged || []).map((file) => (
                    <button
                      key={file}
                      onClick={() => handleSelectFileDiff(file, false)}
                      className={`w-full text-left px-2 py-1 text-[10px] font-mono rounded truncate block transition-all ${
                        selectedFile === file && !isStagedSelected
                          ? "bg-amber-600/10 text-amber-400 border border-amber-500/20"
                          : "text-gray-400 hover:text-gray-200 bg-white/3 border border-transparent"
                      }`}
                    >
                      ✎ {file}
                    </button>
                  ))}
                  {gitStatus?.unstaged?.length === 0 && (
                    <p className="text-[10px] text-gray-600 italic font-mono pl-2">No modified files.</p>
                  )}
                </div>
              </div>

              {/* Untracked files */}
              <div className="space-y-1.5 select-none">
                <span className="text-[9px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                  Untracked Files ({gitStatus?.untracked?.length || 0})
                </span>
                <div className="max-h-[140px] overflow-y-auto scrollbar-thin space-y-1">
                  {(gitStatus?.untracked || []).map((file) => (
                    <div
                      key={file}
                      className="px-2 py-1 text-[10px] font-mono rounded truncate bg-white/3 text-gray-500 border border-transparent"
                    >
                      ? {file}
                    </div>
                  ))}
                  {gitStatus?.untracked?.length === 0 && (
                    <p className="text-[10px] text-gray-600 italic font-mono pl-2">No untracked files.</p>
                  )}
                </div>
              </div>

              {/* AI Commit message generation tool */}
              {gitStatus?.staged?.length > 0 && (
                <div className="bg-white/3 border border-white/5 rounded-xl p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold uppercase text-gray-500 tracking-wider">
                      AI Commit Helper
                    </span>
                    <button
                      onClick={handleGenerateCommitMessage}
                      disabled={isMsgGenerating}
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-violet-600 text-white hover:bg-violet-500 transition-all"
                    >
                      {isMsgGenerating ? "Writing..." : "Write Message"}
                    </button>
                  </div>
                  {commitMessage && (
                    <textarea
                      readOnly
                      value={commitMessage}
                      className="w-full bg-[#06080d] border border-white/5 rounded-lg p-2 text-[10px] text-gray-300 font-mono resize-none focus:outline-none h-[64px]"
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
              <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-4">
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
                  className="w-full px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-500 transition-all disabled:opacity-40"
                >
                  {isPRLoading ? "Analyzing..." : "Review Changes (AI PR Audit)"}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right column Diff rendering pane */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
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
