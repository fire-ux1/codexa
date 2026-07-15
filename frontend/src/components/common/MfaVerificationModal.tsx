import React, { useState } from "react";
import { KeyRound, ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import { loginMfaVerify } from "../../services/api";

interface MfaVerificationModalProps {
  tempToken: string;
  onSuccess: (token: string, refreshToken: string, user: any) => void;
  onCancel: () => void;
}

export default function MfaVerificationModal({
  tempToken,
  onSuccess,
  onCancel,
}: MfaVerificationModalProps) {
  const [code, setCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;

    try {
      setIsSubmitting(true);
      setError(null);
      
      const res = await loginMfaVerify(tempToken, code);
      // Success: trigger callback with newly created session tokens
      onSuccess(res.token, res.refresh_token ?? "", res.user);
    } catch (err: any) {
      console.error("Error verifying MFA login:", err);
      setError(err?.response?.data?.detail || err?.message || "Invalid authenticator code. Verification failed.");
      setCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md select-text font-sans">
      <div className="w-full max-w-md bg-[#10141B] border border-[#1c2230] rounded-3xl p-6 space-y-6 shadow-2xl relative glass animate-scale-in">
        
        {/* Header Icon */}
        <div className="text-center space-y-2 select-none">
          <div className="w-12 h-12 rounded-2xl bg-[#FF9D4D]/10 border border-[#FF9D4D]/20 flex items-center justify-center mx-auto text-[#FF9D4D] animate-pulse">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Two-Factor Authentication</h3>
          <p className="text-[10px] text-gray-400 max-w-[280px] mx-auto leading-normal">
            Enter the 6-digit verification code from your authenticator app to authorize your session.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-[10px] font-mono flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Code Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-center">
            <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500 block">Security Code</label>
            <input
              type="text"
              required
              maxLength={6}
              autoFocus
              placeholder="000 000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full max-w-[240px] mx-auto px-4 py-2.5 bg-[#0C0F16] border border-[#1c2230] rounded-2xl text-base font-mono text-center tracking-[0.6em] text-white placeholder-gray-800 focus:outline-none focus:border-[#FF9D4D]/50 select-all"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2 select-none">
            <button
              type="submit"
              disabled={isSubmitting || code.length < 6}
              className="w-full py-2.5 bg-[#FF9D4D] hover:bg-[#FFB073] disabled:opacity-50 text-[#0A0D12] font-mono font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#FF9D4D]/5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify and Log In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-gray-500 hover:text-gray-300 font-mono text-[10px] uppercase tracking-wider rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel Login
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
