import { useState } from "react";

const TOUR_STEPS = [
  {
    target: "body",
    title: "🚀 Welcome to CodePilot AI!",
    content: "Let's take a quick 1-minute tour of your new AI-powered workspace to get you up to speed.",
  },
  {
    target: "explorer",
    title: "📁 Repository File Explorer",
    content: "Browse all the source files in the currently cloned repository. Click any file to open it in the editor.",
  },
  {
    target: "editor",
    title: "📝 Code Editor with Inline AI",
    content: "View and edit source code here. Right-click or select code blocks to trigger context-aware inline AI actions like Refactor, Explain, or Generate Tests.",
  },
  {
    target: "ai-assistant",
    title: "🤖 AI Assistant Sidebar",
    content: "Ask natural language questions about the codebase, run multi-agent scripts, or generate and apply .diff patches directly in this pane.",
  },
  {
    target: "dock-tabs",
    title: "📊 Deep Code Analyzers",
    content: "Launch architectural visualizations, view import maps, trace function call graphs, run code quality reviews, or inspect the project timeline.",
  },
  {
    target: "command-palette",
    title: "⌨️ Keyboard Shortcuts & Commands",
    content: "Press Ctrl+P or Ctrl+K at any time to open the VS-Code style Command Palette for quick search and navigation.",
  }
];

export default function InteractiveTour() {
  const [activeStep, setActiveStep] = useState(0);
  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem("codepilot_tour_done") !== "true";
  });

  const handleNext = () => {
    if (activeStep < TOUR_STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsOpen(false);
    localStorage.setItem("codepilot_tour_done", "true");
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[activeStep];

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-5 rounded-2xl border border-indigo-500/30 bg-[#090d16]/95 backdrop-blur-xl shadow-2xl glass select-none animate-slide-in">
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full filter blur-2xl pointer-events-none"></div>
      
      <div className="space-y-4">
        {/* Step Progress Header */}
        <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-widest text-gray-500">
          <span>CODELAB TOUR</span>
          <span className="text-indigo-400">
            {activeStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-white leading-snug">{step.title}</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
            {step.content}
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 shrink-0">
          <button
            onClick={handleSkip}
            className="text-[10px] font-bold font-mono text-gray-500 hover:text-gray-300 transition-all uppercase tracking-wider"
          >
            Skip Tour
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-mono text-[10px] tracking-wider transition-all uppercase shadow-lg shadow-indigo-600/10 active:scale-[0.97]"
            >
              {activeStep === TOUR_STEPS.length - 1 ? "Get Started" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
