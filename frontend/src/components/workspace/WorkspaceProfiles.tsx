// @ts-nocheck
import { useState } from "react";
import { AppWindow, Check } from "lucide-react";

export default function WorkspaceProfiles({ onApplyProfile }) {
  const [activeProfile, setActiveProfile] = useState(() => {
    return localStorage.getItem("workspace-profile") || "full-stack";
  });

  const profiles = [
    {
      id: "backend-api",
      name: "Backend API Engineering",
      description: "Auto-splits python models, maximizes terminal, and keeps call graph trace panel visible.",
      icon: "ðŸ",
    },
    {
      id: "frontend-react",
      name: "Frontend React Development",
      description: "Opens JSX file explorer, highlights component hierarchies, and activates hook audits.",
      icon: "âš›ï¸",
    },
    {
      id: "code-review",
      name: "Quality Assurance & Code Review",
      description: "Focuses on security metrics, technical debt lists, and patch diff view layouts.",
      icon: "ðŸ›¡ï¸",
    },
    {
      id: "full-stack",
      name: "Full Stack Studio (Default)",
      description: "Standard balanced viewport layout matching general workspace files search modes.",
      icon: "ðŸ’¼",
    },
  ];

  const applyProfile = (profId) => {
    setActiveProfile(profId);
    localStorage.setItem("workspace-profile", profId);
    if (onApplyProfile) {
      onApplyProfile(profId);
    }
  };

  return (
    <div className="space-y-4 select-none text-left">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <AppWindow className="w-4 h-4 text-indigo-400" /> Developer Workspace Profiles
        </h3>
        <p className="text-[10px] text-gray-500">Select preset profiles configured for target engineering disciplines.</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-1">
        {profiles.map((profile) => {
          const isSelected = activeProfile === profile.id;
          return (
            <button
              key={profile.id}
              onClick={() => applyProfile(profile.id)}
              className={`p-3 rounded-xl border text-left flex justify-between gap-3 items-start transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-600/10 border-indigo-500/30 text-white"
                  : "bg-[#141822] border-[#1c2230] text-gray-400 hover:bg-[#1b212f]"
              }`}
            >
              <div className="flex gap-2.5">
                <span className="text-sm shrink-0 mt-0.5">{profile.icon}</span>
                <div>
                  <span className="text-[10px] font-bold font-sans block">{profile.name}</span>
                  <span className="text-[9px] text-gray-500 mt-0.5 block leading-relaxed">{profile.description}</span>
                </div>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

