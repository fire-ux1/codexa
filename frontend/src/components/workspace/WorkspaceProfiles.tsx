import { useState } from "react";
import { AppWindow, Check } from "lucide-react";

interface WorkspaceProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface WorkspaceProfilesProps {
  onApplyProfile?: (profileId: string) => void;
}

const STORAGE_KEY = "workspace-profile";
const DEFAULT_PROFILE = "full-stack";

const PROFILES: WorkspaceProfile[] = [
  {
    id: "backend-api",
    name: "Backend API Engineering",
    description: "Auto-splits python models, maximizes terminal, and keeps call graph trace panel visible.",
    icon: "🐍",
  },
  {
    id: "frontend-react",
    name: "Frontend React Development",
    description: "Opens JSX file explorer, highlights component hierarchies, and activates hook audits.",
    icon: "⚛️",
  },
  {
    id: "code-review",
    name: "Quality Assurance & Code Review",
    description: "Focuses on security metrics, technical debt lists, and patch diff view layouts.",
    icon: "🛡️",
  },
  {
    id: "full-stack",
    name: "Full Stack Studio (Default)",
    description: "Standard balanced viewport layout matching general workspace files search modes.",
    icon: "💼",
  },
];

function readStoredProfile(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Guard against a stale/corrupted value pointing at a profile that no longer exists
    return stored && PROFILES.some((p) => p.id === stored) ? stored : DEFAULT_PROFILE;
  } catch {
    // localStorage can throw in private browsing / SSR / restricted contexts
    return DEFAULT_PROFILE;
  }
}

function writeStoredProfile(profileId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, profileId);
  } catch {
    // Non-fatal: profile selection still applies for this session via state,
    // it just won't persist across reloads.
  }
}

export default function WorkspaceProfiles({ onApplyProfile }: WorkspaceProfilesProps) {
  const [activeProfile, setActiveProfile] = useState<string>(readStoredProfile);

  const applyProfile = (profileId: string) => {
    setActiveProfile(profileId);
    writeStoredProfile(profileId);
    onApplyProfile?.(profileId);
  };

  return (
    <div className="space-y-4 select-none text-left">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <AppWindow className="w-4 h-4 text-indigo-400" /> Developer Workspace Profiles
        </h3>
        <p className="text-[10px] text-gray-500">Select preset profiles configured for target engineering disciplines.</p>
      </div>

      <div
        role="radiogroup"
        aria-label="Workspace profile"
        className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1"
      >
        {PROFILES.map((profile) => {
          const isSelected = activeProfile === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => applyProfile(profile.id)}
              className={`p-3 rounded-xl border text-left flex justify-between gap-3 items-start transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600/10 border-indigo-500/30 text-white"
                  : "bg-[#141822] border-[#1c2230] text-gray-400 hover:bg-[#1b212f]"
              }`}
            >
              <div className="flex gap-2.5">
                <span aria-hidden="true" className="text-sm shrink-0 mt-0.5">{profile.icon}</span>
                <div>
                  <span className="text-[10px] font-bold font-sans block">{profile.name}</span>
                  <span className="text-[9px] text-gray-500 mt-0.5 block leading-relaxed">{profile.description}</span>
                </div>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}