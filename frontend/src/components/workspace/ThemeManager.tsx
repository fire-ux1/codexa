// @ts-nocheck
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Sun, Moon, Sparkles, Check } from "lucide-react";

export default function ThemeManager() {
  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem("workspace-theme") || "dark-default";
  });

  const themes = [
    { id: "dark-default", name: "Deep Dark (Default)", bg: "bg-[#090c13]", border: "border-[#1c2230]", icon: <Moon className="w-4 h-4 text-indigo-400" /> },
    { id: "dark-glass", name: "Glassmorphism Cyberpunk", bg: "bg-[#05070d]/90", border: "border-[#243354]", icon: <Sparkles className="w-4 h-4 text-cyan-400" /> },
    { id: "light-standard", name: "Clean Light", bg: "bg-white", border: "border-gray-200", icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { id: "dark-highcontrast", name: "High Contrast Dark", bg: "bg-black", border: "border-white/40", icon: <Moon className="w-4 h-4 text-rose-500 font-bold" /> },
  ];

  const applyTheme = (themeId) => {
    setActiveTheme(themeId);
    localStorage.setItem("workspace-theme", themeId);
    // Apply styling selectors globally
    const body = document.body;
    body.className = body.className.replace(/\btheme-\S+/g, "");
    body.classList.add(`theme-${themeId}`);
  };

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  return (
    <div className="space-y-4 select-none text-left">
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">UI Themes & Appearance</h3>
        <p className="text-[10px] text-gray-500">Pick a workspace interface color profile.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {themes.map((theme) => {
          const isSelected = activeTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => applyTheme(theme.id)}
              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-indigo-600/10 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/5"
                  : "bg-[#141822] border-[#1c2230] hover:bg-[#1b212f] text-gray-400 hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl bg-white/5 border border-white/5`}>{theme.icon}</span>
                <span className="text-[11px] font-bold font-sans">{theme.name}</span>
              </div>
              {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

