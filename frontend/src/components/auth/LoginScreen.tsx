import React from "react";

interface LoginScreenProps {
  showSandboxForm: boolean;
  sandboxName: string;
  sandboxEmail: string;
  onSandboxNameChange: (val: string) => void;
  onSandboxEmailChange: (val: string) => void;
  onToggleSandboxForm: (val: boolean) => void;
  onSandboxLogin: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Optional: disables the form and shows a connecting state while a request is in flight */
  isSubmitting?: boolean;
  /** Optional: renders an inline error message above the submit button */
  errorMessage?: string | null;
}

const FLOATING_TOKENS = [
  { text: "const parseAST = (code) => ...", left: "5%", delay: "0s", duration: "22s", color: "text-accent" },
  { text: 'git commit -m "fix auth bypass"', left: "20%", delay: "4s", duration: "28s", color: "text-secondary" },
  { text: "jwt.verify(token, secret)", left: "75%", delay: "2s", duration: "25s", color: "text-violet" },
  { text: "import { openRouter } from 'ai'", left: "85%", delay: "6s", duration: "20s", color: "text-accent" },
  { text: "struct GraphNode<T> { ... }", left: "12%", delay: "10s", duration: "30s", color: "text-violet" },
  { text: "qdrant.search(collection, query)", left: "62%", delay: "8s", duration: "27s", color: "text-secondary" },
  { text: "type Token = 'string' | 'number'", left: "38%", delay: "12s", duration: "24s", color: "text-accent" },
  { text: "repoService.indexPending()", left: "70%", delay: "14s", duration: "32s", color: "text-secondary" },
  { text: "class ASTVisitor extends NodeVisitor", left: "3%", delay: "16s", duration: "26s", color: "text-violet" },
  { text: "await prisma.user.update(...)", left: "50%", delay: "18s", duration: "29s", color: "text-accent" },
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

  return (
    <div className="min-h-screen mesh-gradient-bg flex items-center justify-center p-6 relative overflow-hidden">

      {/* Background Decorative Tech Grid Overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"
      ></div>

      {/* Floating Ambient Glowing Orbs */}
      <div aria-hidden="true" className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-radial from-accent/10 via-transparent to-transparent filter blur-3xl pointer-events-none glow-orb-float-1 z-0"></div>
      <div aria-hidden="true" className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-radial from-secondary/5 via-transparent to-transparent filter blur-3xl pointer-events-none glow-orb-float-2 z-0"></div>

      {/* Floating Monospace Code Tokens */}
      <div aria-hidden="true" className="contents select-none">
        {FLOATING_TOKENS.map((token, idx) => (
          <div
            key={idx}
            className={`floating-token ${token.color}`}
            style={{
              left: token.left,
              animationDelay: token.delay,
              animationDuration: token.duration,
            }}
          >
            {token.text}
          </div>
        ))}
      </div>

      {/* Centered Glassmorphic Login Card */}
      <div className="w-full max-w-[420px] glass glass-card-glow border border-white/5 rounded-3xl p-10 backdrop-blur-2xl relative z-10 animate-fade-in text-center">

        {/* Glow halo line at the top border */}
        <div aria-hidden="true" className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>

        {/* Dynamic Logo Symbol */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-white/[0.02] border border-white/10 shadow-[0_0_20px_rgba(255,157,77,0.15)] overflow-hidden">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded bg-accent shadow-[0_0_12px_rgba(255,157,77,0.7)] animate-pulse-glow"></span>
          </div>
        </div>

        {/* Header Text */}
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-text-strong font-display">
            Welcome to Codexa
          </h1>
          <p className="text-xs text-text max-w-[280px] mx-auto leading-relaxed">
            Index repositories structurally and discover code insights with AI.
          </p>
        </div>

        {/* Sliding Modes Switcher */}
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="sliding-tabs-container mb-8"
        >
          <div aria-hidden="true" className={`sliding-tab-slider ${showSandboxForm ? "right" : ""}`}></div>
          <button
            type="button"
            role="tab"
            aria-selected={!showSandboxForm}
            onClick={() => onToggleSandboxForm(false)}
            className={`sliding-tab-btn ${!showSandboxForm ? "active" : ""}`}
          >
            OAuth Auth
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={showSandboxForm}
            onClick={() => onToggleSandboxForm(true)}
            className={`sliding-tab-btn ${showSandboxForm ? "active" : ""}`}
          >
            Sandbox Mode
          </button>
        </div>

        {/* Sign-In Panels */}
        {!showSandboxForm ? (
          <div className="space-y-4">
            {/* GitHub Auth Button */}
            <a
              href={`${apiBase}/auth/login/github`}
              className="w-full py-3 px-4 rounded-xl border border-border bg-panel-alt/50 hover:bg-[#181e29]/75 hover:border-accent hover:-translate-y-[1px] text-text-strong font-semibold text-xs transition-all duration-250 flex items-center justify-center gap-3 cursor-pointer"
            >
              <span aria-hidden="true" className="font-mono text-soft text-sm">⌥</span>
              <span>Sign in with GitHub</span>
            </a>

            {/* Google Auth Button */}
            <a
              href={`${apiBase}/auth/login/google`}
              className="w-full py-3 px-4 rounded-xl border border-border bg-panel-alt/50 hover:bg-[#181e29]/75 hover:border-secondary hover:-translate-y-[1px] text-text-strong font-semibold text-xs transition-all duration-250 flex items-center justify-center gap-3 cursor-pointer"
            >
              <span aria-hidden="true" className="font-mono text-secondary text-sm">◐</span>
              <span>Sign in with Google</span>
            </a>
          </div>
        ) : (
          <form onSubmit={onSandboxLogin} className="space-y-5 text-left" noValidate={false}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="sandbox-name"
                  className="block font-mono text-[10px] uppercase tracking-wider text-soft mb-1.5"
                >
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
                  className="w-full p-3 bg-bg/85 border border-border rounded-xl text-xs text-text-strong outline-none input-focus-glow transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="name"
                />
              </div>
              <div>
                <label
                  htmlFor="sandbox-email"
                  className="block font-mono text-[10px] uppercase tracking-wider text-soft mb-1.5"
                >
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
                  className="w-full p-3 bg-bg/85 border border-border rounded-xl text-xs text-text-strong outline-none input-focus-glow transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="email"
                />
              </div>
            </div>

            {errorMessage && (
              <p role="alert" className="text-[11px] text-red-400 font-mono leading-relaxed">
                {errorMessage}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="w-full py-3 bg-secondary hover:bg-secondary-strong rounded-xl text-xs text-bg font-bold transition-all shadow-md shadow-secondary/15 cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-secondary"
              >
                {isSubmitting ? "Connecting…" : "Access Sandbox Panel →"}
              </button>
            </div>
          </form>
        )}


        {/* Footer */}
        <div className="mt-8 text-center text-xs text-soft font-mono">
          Need help?{" "}
          <a
            href="mailto:support@codexa.dev"
            className="text-accent hover:underline hover:text-accent-strong transition-all"
          >
            Support
          </a>
        </div>

      </div>

    </div>
  );
}