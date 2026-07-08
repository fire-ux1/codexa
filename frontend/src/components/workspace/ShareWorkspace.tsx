import { useState } from "react";
import { Link, Check, Globe } from "lucide-react";

export default function ShareWorkspace() {
  const [copied, setCopied] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string>("");

  const generateLink = () => {
    const randomHash = Math.random().toString(36).substring(2, 10);
    const link = `https://codepilot.ai/share/repo-${randomHash}`;
    setShareLink(link);
    setCopied(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 select-none text-left font-sans bg-bg p-3 border border-border rounded-xl shadow-sm">
      <div className="border-b border-border pb-2">
        <h3 className="text-xs font-bold text-text-strong font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-accent" /> Share Workspace View
        </h3>
        <p className="text-[10px] text-muted font-sans">Generate public read-only links for team reference.</p>
      </div>

      <div className="p-3 bg-panel border border-border rounded-xl space-y-3 shadow-sm">
        <button
          onClick={generateLink}
          className="w-full py-1.5 bg-accent hover:bg-accent-strong text-bg font-bold rounded-lg text-[10px] font-mono transition-colors cursor-pointer shadow-sm"
        >
          Generate Secure Share Link
        </button>

        {shareLink && (
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={shareLink}
              className="w-full bg-bg border border-border rounded-xl px-2.5 py-1 text-[9px] font-mono text-muted focus:outline-none shadow-inner"
            />
            <button
              onClick={copyLink}
              className="p-1 rounded bg-bg hover:bg-panel border border-border text-muted hover:text-text-strong transition-all cursor-pointer shrink-0"
              title="Copy link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Link className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
