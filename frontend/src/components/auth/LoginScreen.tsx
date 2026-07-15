import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Layers, Network, Sparkles } from "lucide-react";
import iconUrl from "../../assets/icon.png";

interface LoginScreenProps {
  showSandboxForm: boolean;
  sandboxName: string;
  sandboxEmail: string;
  onSandboxNameChange: (val: string) => void;
  onSandboxEmailChange: (val: string) => void;
  onToggleSandboxForm: (val: boolean) => void;
  onSandboxLogin: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

// 12 rising particles for ambient animation
const PARTICLES = [
  { top: "75%", left: "12%", delay: "0s", duration: "18s", size: "2px" },
  { top: "60%", left: "28%", delay: "3s", duration: "24s", size: "3px" },
  { top: "85%", left: "42%", delay: "1.5s", duration: "21s", size: "2px" },
  { top: "70%", left: "22%", delay: "4.5s", duration: "26s", size: "4px" },
  { top: "65%", left: "8%", delay: "2s", duration: "16s", size: "2px" },
  { top: "90%", left: "33%", delay: "5.5s", duration: "28s", size: "3px" },
  { top: "50%", left: "38%", delay: "7s", duration: "19s", size: "2px" },
  { top: "82%", left: "18%", delay: "6.5s", duration: "22s", size: "2.5px" },
  { top: "52%", left: "48%", delay: "8.5s", duration: "25s", size: "3px" },
  { top: "78%", left: "6%", delay: "10s", duration: "17s", size: "2px" },
  { top: "45%", left: "25%", delay: "11s", duration: "23s", size: "2px" },
  { top: "88%", left: "55%", delay: "12s", duration: "27s", size: "3.5px" },
];

export default function LoginScreen({
  showSandboxForm,
  sandboxName,
  sandboxEmail,
  onSandboxNameChange,
  onSandboxEmailChange,
  onToggleSandboxForm,
  onSandboxLogin,
  isSubmitting = false,
  errorMessage = null,
}: LoginScreenProps) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const originParam = `?origin=${encodeURIComponent(window.location.origin)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleEmailLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("Standard email login is disabled for this project workspace. Please use Google, GitHub, or switch to 'Sandbox Mode'.");
  };

  return (
    <div className="min-h-screen bg-[#030407] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans select-none">
      
      {/* Component-level animations */}
      <style>{`
        /* Slow float for background liquid blobs */
        @keyframes driftOrb1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(60px, -50px) scale(1.2); }
          66% { transform: translate(-40px, 60px) scale(0.95); }
        }
        @keyframes driftOrb2 {
          0%, 100% { transform: translate(0px, 0px) scale(1.1); }
          33% { transform: translate(-70px, 40px) scale(0.9); }
          66% { transform: translate(50px, -60px) scale(1.18); }
        }
        @keyframes driftOrb3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-40px, -40px) scale(1.1); }
        }
        .animate-orb-1 { animation: driftOrb1 26s infinite ease-in-out; }
        .animate-orb-2 { animation: driftOrb2 32s infinite ease-in-out; }
        .animate-orb-3 { animation: driftOrb3 22s infinite ease-in-out; }

        /* Slow upward float for particles */
        @keyframes floatUpward {
          0% { transform: translateY(60px); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-130px); opacity: 0; }
        }
        .animate-float-upward {
          animation: floatUpward 14s infinite linear;
        }

        /* Slow drift for mock editor window */
        @keyframes driftEditor {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-7px) translateX(4px); }
        }
        .animate-drift-editor {
          animation: driftEditor 8s ease-in-out infinite;
        }

        /* Faint scanner light travelling across grid */
        @keyframes gridShimmer {
          0% { transform: translate(-30%, -30%) rotate(45deg) translateY(-100%); }
          100% { transform: translate(-30%, -30%) rotate(45deg) translateY(100%); }
        }
        .animate-grid-shimmer {
          animation: gridShimmer 14s infinite linear;
        }

        /* Flowing wave mesh animation */
        @keyframes waveMotion1 {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(6px) scaleY(1.04); }
        }
        @keyframes waveMotion2 {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(-5px) scaleY(0.96); }
        }
        @keyframes waveMotion3 {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(3px) scaleY(1.02); }
        }
        .animate-wave-1 { animation: waveMotion1 11s ease-in-out infinite; }
        .animate-wave-2 { animation: waveMotion2 8s ease-in-out infinite; }
        .animate-wave-3 { animation: waveMotion3 14s ease-in-out infinite; }

        /* Faint breathing cyan accent node */
        @keyframes breathingCyan {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(127, 227, 232, 0.4)); opacity: 0.9; }
          50% { filter: drop-shadow(0 0 12px rgba(127, 227, 232, 0.9)); opacity: 1; }
        }
        .animate-breathe-cyan {
          animation: breathingCyan 3.5s ease-in-out infinite;
        }

        /* Link animation */
        @keyframes pulseLink {
          0%, 100% { opacity: 0.2; stroke-width: 1; }
          50% { opacity: 0.55; stroke-width: 1.5; }
        }
        .animate-pulse-link {
          animation: pulseLink 4.5s ease-in-out infinite;
        }

        /* Node drift */
        @keyframes floatGraphNode {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-3px) translateX(2px); }
          66% { transform: translateY(3px) translateX(-1px); }
        }
        .animate-float-node {
          animation: floatGraphNode 6.5s ease-in-out infinite;
        }

        /* Shimmer gradient effect for buttons */
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          background-size: 200% auto;
          animation: gradientShift 4s ease infinite;
        }

        .input-focus-glow:focus {
          border-color: rgba(182, 156, 255, 0.6) !important;
          box-shadow: 0 0 14px rgba(182, 156, 255, 0.18) !important;
        }
        .glass-card-glow {
          box-shadow: 0 0 80px -10px rgba(182, 156, 255, 0.12),
                      0 32px 64px -16px rgba(0, 0, 0, 0.7) !important;
        }
      `}</style>

      {/* DYNAMIC LIQUID BACKGROUND: Moving glowing radial orbs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        
        {/* Orb 1: Cyan/Teal Glow - Top Left */}
        <div className="absolute -top-[10%] -left-[10%] w-[600px] h-[600px] rounded-full bg-radial from-[#7FE3E8]/10 via-[#7FE3E8]/0 to-transparent filter blur-[100px] animate-orb-1 opacity-80"></div>
        
        {/* Orb 2: Purple/Indigo Glow - Bottom Right */}
        <div className="absolute -bottom-[15%] -right-[15%] w-[650px] h-[650px] rounded-full bg-radial from-[#B69CFF]/8 via-[#B69CFF]/0 to-transparent filter blur-[100px] animate-orb-2 opacity-80"></div>

        {/* Orb 3: Faint Indigo Glow - Center Right */}
        <div className="absolute top-[20%] right-[10%] w-[550px] h-[550px] rounded-full bg-radial from-indigo-500/6 via-transparent to-transparent filter blur-[110px] animate-orb-3 opacity-90"></div>
      </div>

      {/* ABSTRACT INTELLIGENCE GRID: Faint grid lines and matrix overlay */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ maskImage: "radial-gradient(circle at 45% 35%, black 25%, transparent 75%)" }}>
        
        {/* Grid pattern (3% opacity) */}
        <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="matrixPattern" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="0.6" fill="rgba(255, 255, 255, 0.08)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#matrixPattern)" />
        </svg>

        {/* Shimmer line scanning the grid */}
        <div className="absolute top-0 left-0 w-[200%] h-[150px] bg-gradient-to-b from-transparent via-[#7FE3E8]/[0.012] to-transparent pointer-events-none transform -translate-x-1/2 -translate-y-1/2 rotate-[45deg] animate-grid-shimmer"></div>

        {/* Soft grid matrix pulsing nodes */}
        <div className="absolute top-[18%] left-[25%] w-1.5 h-1.5 rounded-full bg-[#7FE3E8] animate-pulse" style={{ animationDuration: "5s" }}></div>
        <div className="absolute top-[32%] left-[48%] w-1 h-1 rounded-full bg-[#B69CFF] animate-pulse" style={{ animationDuration: "7s", animationDelay: "1.5s" }}></div>
        <div className="absolute top-[10%] left-[62%] w-1.5 h-1.5 rounded-full bg-[#FF9D4D] animate-pulse" style={{ animationDuration: "6s", animationDelay: "3s" }}></div>
        <div className="absolute top-[38%] left-[78%] w-1 h-1 rounded-full bg-[#7FE3E8] animate-pulse" style={{ animationDuration: "8s", animationDelay: "0.5s" }}></div>
      </div>

      {/* Floating particles rising slowly */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#B69CFF]/15 animate-float-upward"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          ></div>
        ))}
      </div>

      {/* Main Two-Column Responsive Layout */}
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Side: Branding & AI Landscape Illustration */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-8 p-4">
          
          {/* Logo Title */}
          <div className="flex items-center gap-3">
            <img src={iconUrl} alt="ChunkWiser Brand Logo" className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-indigo-500/10" />
            <span className="text-xl font-bold tracking-wider text-text-strong font-display">ChunkWiser</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-text-strong tracking-tight leading-[1.12] font-display">
              Make sense of <br />
              <span className="bg-gradient-to-r from-[#B69CFF] via-[#7FE3E8] to-[#B69CFF] bg-clip-text text-transparent filter drop-shadow-[0_2px_8px_rgba(182,156,255,0.18)]">
                any codebase.
              </span>
            </h1>
            <p className="text-sm md:text-base text-text leading-relaxed max-w-[460px]">
              ChunkWiser breaks down complex projects into intelligent chunks and delivers deep insights you can act on.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4 max-w-[480px]">
            <div className="flex gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.025] hover:border-white/10 transition-all hover:translate-x-1 duration-300">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-[#B69CFF]/10 flex items-center justify-center text-[#B69CFF] border border-[#B69CFF]/20 shadow-inner">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-strong">Instant codebase understanding</h3>
                <p className="text-xs text-soft mt-0.5">AI-powered parsing and structure mapping</p>
              </div>
            </div>

            <div className="flex gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.025] hover:border-white/10 transition-all hover:translate-x-1 duration-300">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-[#7FE3E8]/10 flex items-center justify-center text-[#7FE3E8] border border-[#7FE3E8]/20 shadow-inner">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-strong">Smart chunking & embeddings</h3>
                <p className="text-xs text-soft mt-0.5">Precise context retrieval at any scale</p>
              </div>
            </div>

            <div className="flex gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.025] hover:border-white/10 transition-all hover:translate-x-1 duration-300">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-[#FF9D4D]/10 flex items-center justify-center text-[#FF9D4D] border border-[#FF9D4D]/20 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-strong">Visualize, explore & ship faster</h3>
                <p className="text-xs text-soft mt-0.5">See the big picture. Move with confidence.</p>
              </div>
            </div>
          </div>

          {/* AI Neural Wireframe Terrain Landscape */}
          <div className="relative w-full h-[230px] bg-[#07090E]/60 border border-white/5 rounded-2xl p-4 overflow-hidden backdrop-blur-sm shadow-inner">
            
            {/* Wave wireframe meshes (smooth layered curves flow horizontally) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#B69CFF" stopOpacity="0.18" />
                  <stop offset="50%" stopColor="#7FE3E8" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#B69CFF" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              
              <path d="M -10,180 Q 40,165 90,190 T 210,180 L 210,240 L -10,240 Z" fill="url(#waveGrad)" stroke="rgba(182,156,255,0.18)" strokeWidth="0.8" className="animate-wave-1" style={{ transformOrigin: "bottom" }} />
              <path d="M -10,195 Q 50,210 110,180 T 210,200 L 210,240 L -10,240 Z" fill="none" stroke="rgba(127,227,232,0.12)" strokeWidth="0.8" className="animate-wave-2" />
              <path d="M -10,170 Q 30,190 70,175 T 210,190 L 210,240 L -10,240 Z" fill="none" stroke="rgba(182,156,255,0.08)" strokeWidth="0.5" className="animate-wave-3" />
            </svg>

            {/* Drifting Mock Code Window (VS Code inspired) */}
            <div className="absolute left-6 top-8 w-[190px] border border-white/10 bg-[#080B10]/95 rounded-xl p-3 shadow-[0_4px_25px_rgba(182,156,255,0.1)] backdrop-blur-md animate-drift-editor">
              <div className="flex gap-1.5 mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500/80"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
              </div>
              
              <div className="font-mono text-[9px] leading-relaxed text-[#7FE3E8]/80 space-y-1">
                <div>
                  <span className="text-[#B69CFF]">import</span> <span className="text-white">{"{"} chunk {"}"}</span> <span className="text-[#B69CFF]">from</span> <span className="text-emerald-400">"cw"</span>;
                </div>
                <div>
                  <span className="text-[#FF9D4D]">const</span> <span className="text-blue-400">repo</span> = <span className="text-[#FF9D4D]">await</span> <span className="text-emerald-300">chunk</span>(<span className="text-emerald-400">"./src"</span>);
                </div>
                <div>
                  <span className="text-[#FF9D4D]">const</span> <span className="text-blue-400">nodes</span> = <span className="text-blue-300">repo.embed</span>();
                </div>
                <div className="h-2"></div>
                <div>
                  <span className="text-[#B69CFF]">export</span> <span className="text-[#B69CFF]">default</span> <span className="text-white">nodes</span>;
                </div>
              </div>
            </div>

            {/* Curved links and rounded square nodes */}
            <div className="absolute right-4 top-4 w-[180px] h-[170px] pointer-events-none">
              <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
                <path d="M 25,65 Q 50,45 75,45" fill="none" stroke="rgba(182, 156, 255, 0.4)" strokeWidth="1" className="animate-pulse-link" />
                <path d="M 75,45 Q 90,70 115,95" fill="none" stroke="rgba(127, 227, 232, 0.4)" strokeWidth="1" className="animate-pulse-link" />
                <path d="M 115,95 Q 130,70 155,55" fill="none" stroke="rgba(182, 156, 255, 0.4)" strokeWidth="1" className="animate-pulse-link" />
                <path d="M 155,55 Q 170,75 185,115" fill="none" stroke="rgba(255, 157, 77, 0.3)" strokeWidth="1" className="animate-pulse-link" />
                <path d="M 25,65 Q 70,100 115,95" fill="none" stroke="rgba(127, 227, 232, 0.2)" strokeWidth="1" />
                <path d="M 115,95 Q 150,120 185,115" fill="none" stroke="rgba(182, 156, 255, 0.2)" strokeWidth="1" />

                {/* Node 1 */}
                <g className="animate-float-node" style={{ animationDelay: "0.2s" }}>
                  <rect x="20" y="60" width="10" height="10" rx="3.5" fill="#B69CFF" opacity="0.85" />
                  <rect x="20" y="60" width="10" height="10" rx="3.5" fill="none" stroke="#B69CFF" strokeWidth="1" className="animate-ping" style={{ transformOrigin: "25px 65px" }} />
                </g>
                
                {/* Node 2 */}
                <g className="animate-float-node" style={{ animationDelay: "1.2s" }}>
                  <rect x="70" y="40" width="10" height="10" rx="3.5" fill="#7FE3E8" opacity="0.85" />
                </g>

                {/* Node 3 - Cyan Accent Node */}
                <g className="animate-float-node" style={{ animationDelay: "0.5s" }}>
                  <rect x="109" y="89" width="13" height="13" rx="4.5" fill="#7FE3E8" className="animate-breathe-cyan" />
                  <rect x="109" y="89" width="13" height="13" rx="4.5" fill="none" stroke="#7FE3E8" strokeWidth="1" className="animate-ping" style={{ transformOrigin: "115.5px 95.5px", animationDuration: "3s" }} />
                </g>

                {/* Node 4 */}
                <g className="animate-float-node" style={{ animationDelay: "2.1s" }}>
                  <rect x="150" y="50" width="10" height="10" rx="3.5" fill="#B69CFF" opacity="0.85" />
                </g>

                {/* Node 5 */}
                <g className="animate-float-node" style={{ animationDelay: "0.9s" }}>
                  <rect x="180" y="110" width="10" height="10" rx="3.5" fill="#FF9D4D" opacity="0.85" />
                </g>
              </svg>
            </div>

            {/* Glowing corner squares */}
            <div className="absolute right-12 bottom-6 w-2 h-2 bg-[#B69CFF]/30 rounded-sm animate-pulse"></div>
            <div className="absolute right-[80px] bottom-12 w-1.5 h-1.5 bg-[#7FE3E8]/30 rounded-sm animate-pulse" style={{ animationDelay: "1s" }}></div>
          </div>

        </div>

        {/* Right Side: High-Fidelity Glassmorphic Login Card */}
        <div className="lg:col-span-6 flex justify-center p-2">
          
          <div className="w-full max-w-[460px] glass glass-card-glow border border-white/[0.06] bg-[#0E121B]/75 rounded-3xl p-6 md:p-8 backdrop-blur-2xl relative transition-all duration-300 z-10">
            
            {/* Fine gradient glow border overlay at the top */}
            <div aria-hidden="true" className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-[#B69CFF]/40 to-transparent"></div>

            {/* Header: Brand Logo & Title */}
            <div className="flex flex-col items-center text-center mb-6">
              <img src={iconUrl} alt="ChunkWiser" className="w-12 h-12 object-contain rounded-2xl shadow-xl shadow-indigo-500/10 mb-3 animate-pulse" />
              <h2 className="text-xl font-bold tracking-tight text-text-strong font-display">Welcome back</h2>
              <p className="text-xs text-soft mt-1">Login to your account</p>
            </div>

            {/* Switcher tabs */}
            <div className="sliding-tabs-container mb-6">
              <div aria-hidden="true" className={`sliding-tab-slider ${showSandboxForm ? "right" : ""}`}></div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  onToggleSandboxForm(false);
                  setLocalError(null);
                }}
                className={`sliding-tab-btn ${!showSandboxForm ? "active" : ""} focus-visible:outline-none disabled:opacity-50`}
              >
                OAUTH / SSO
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  onToggleSandboxForm(true);
                  setLocalError(null);
                }}
                className={`sliding-tab-btn ${showSandboxForm ? "active" : ""} focus-visible:outline-none disabled:opacity-50`}
              >
                Sandbox Mode
              </button>
            </div>

            {/* Form Panels */}
            {!showSandboxForm ? (
              <div className="space-y-5">
                
                {/* Standard login form */}
                <form onSubmit={handleEmailLoginSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email-input" className="block text-[10px] uppercase font-mono tracking-wider text-soft mb-1.5">
                      Email
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 w-4 h-4 text-muted pointer-events-none" />
                      <input
                        id="email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#06080C]/80 border border-white/5 rounded-xl text-xs text-text-strong outline-none input-focus-glow transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password-input" className="block text-[10px] uppercase font-mono tracking-wider text-soft mb-1.5">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 w-4 h-4 text-muted pointer-events-none" />
                      <input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 bg-[#06080C]/80 border border-white/5 rounded-xl text-xs text-text-strong outline-none input-focus-glow transition-all font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-muted hover:text-text-strong transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-soft">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" className="accent-[#B69CFF] rounded cursor-pointer" />
                      <span>Remember me</span>
                    </label>
                    <a
                      href="#forgot-password"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocalError("Password recovery is currently disabled. Please contact your workspace administrator or use OAuth.");
                      }}
                      className="text-[#B69CFF] hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>

                  {(localError || errorMessage) && (
                    <p role="alert" className="text-[11px] text-red-400 font-mono leading-relaxed bg-red-400/5 p-2.5 rounded-lg border border-red-500/10 font-sans">
                      {localError || errorMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-[#B69CFF] via-[#7FE3E8] to-[#B69CFF] text-[#06080C] font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] cursor-pointer animate-gradient-shift"
                  >
                    Login
                  </button>
                </form>

                {/* Or Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/5"></div>
                  <span className="text-[10px] uppercase font-mono text-muted">or</span>
                  <div className="flex-1 h-px bg-white/5"></div>
                </div>

                {/* Social logins */}
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`${apiBase}/auth/login/google${originParam}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 border border-white/5 bg-[#06080C]/40 hover:bg-[#06080C]/80 rounded-xl text-xs text-text-strong font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google</span>
                  </a>

                  <a
                    href={`${apiBase}/auth/login/github${originParam}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 border border-white/5 bg-[#06080C]/40 hover:bg-[#06080C]/80 rounded-xl text-xs text-text-strong font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                    <span>GitHub</span>
                  </a>
                </div>

                {/* SSO and SAML */}
                <div className="flex justify-center gap-4 text-[10px] font-mono text-soft pt-1">
                  <a href={`${apiBase}/auth/sso/login${originParam}`} className="hover:text-text-strong hover:underline transition-colors">
                    Enterprise SSO
                  </a>
                  <span className="text-white/10">|</span>
                  <a href={`${apiBase}/auth/saml/login${originParam}`} className="hover:text-text-strong hover:underline transition-colors">
                    SAML 2.0 IdP
                  </a>
                </div>

                {/* Footer sign up notice */}
                <div className="text-center text-xs text-soft pt-2">
                  Don't have an account?{" "}
                  <a
                    href="#signup"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocalError("Self-registration is currently disabled. Please contact your workspace administrator to create an account.");
                    }}
                    className="text-[#B69CFF] font-semibold hover:underline"
                  >
                    Sign up
                  </a>
                </div>

              </div>
            ) : (
              <form onSubmit={onSandboxLogin} className="space-y-4 text-left">
                <div>
                  <label htmlFor="sandbox-name" className="block font-mono text-[10px] uppercase tracking-wider text-soft mb-1.5">
                    Developer Name
                  </label>
                  <input
                    id="sandbox-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    disabled={isSubmitting}
                    value={sandboxName}
                    onChange={(e) => onSandboxNameChange(e.target.value)}
                    className="w-full p-3 bg-[#06080C]/80 border border-white/5 rounded-xl text-xs text-text-strong outline-none input-focus-glow transition-all"
                    placeholder="name"
                  />
                </div>
                <div>
                  <label htmlFor="sandbox-email" className="block font-mono text-[10px] uppercase tracking-wider text-soft mb-1.5">
                    Developer Email
                  </label>
                  <input
                    id="sandbox-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    disabled={isSubmitting}
                    value={sandboxEmail}
                    onChange={(e) => onSandboxEmailChange(e.target.value)}
                    className="w-full p-3 bg-[#06080C]/80 border border-white/5 rounded-xl text-xs text-text-strong outline-none input-focus-glow transition-all"
                    placeholder="email"
                  />
                </div>

                {errorMessage && (
                  <p role="alert" className="text-[11px] text-red-400 font-mono leading-relaxed bg-red-400/5 p-2.5 rounded-lg border border-red-500/10 font-sans">
                    {errorMessage}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="w-full py-3 bg-[#7FE3E8] hover:bg-[#7FE3E8]/90 text-[#06080C] font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? "Connecting…" : "Access Sandbox Panel →"}
                  </button>
                </div>
              </form>
            )}

            {/* Footer Support Link */}
            <div className="mt-8 text-center text-[10px] text-soft font-mono">
              Need help?{" "}
              <a
                href="mailto:support@chunkwiser.ai"
                className="text-[#B69CFF] hover:underline"
              >
                Support
              </a>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}