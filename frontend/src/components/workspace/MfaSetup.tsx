import React, { useState, useEffect, useRef, useCallback } from "react";
import { ShieldCheck, ShieldAlert, KeyRound, Loader2, ArrowRight, X, ShieldX, Copy, Check, AlertCircle } from "lucide-react";
import { mfaSetup, mfaConfirm, mfaDisable, fetchUser } from "../../services/api";

type MfaStatus = "unknown" | "enabled" | "disabled";

export default function MfaSetup() {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>("unknown");
  const [loading, setLoading] = useState<boolean>(true);
  const [statusCheckFailed, setStatusCheckFailed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Setup Flow States
  const [setupStep, setSetupStep] = useState<"idle" | "scan" | "verify">("idle");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [secretCopied, setSecretCopied] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Disable-flow confirmation (replaces the blocking window.confirm)
  const [confirmingDisable, setConfirmingDisable] = useState<boolean>(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load current user profile to inspect MFA status
  const checkMfaStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusCheckFailed(false);
    try {
      const user = await fetchUser();
      if (!mountedRef.current) return;
      setMfaStatus(user.mfa_enabled ? "enabled" : "disabled");
    } catch (err: any) {
      if (!mountedRef.current) return;
      console.error("Error checking MFA status:", err);
      // Important: on failure we do NOT default to "disabled" — that would show
      // the "set up 2FA" screen even if 2FA is actually already on, which is
      // misleading for a security-sensitive control.
      setMfaStatus("unknown");
      setStatusCheckFailed(true);
      setError(err?.response?.data?.detail || err?.message || "Failed to query MFA security status.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkMfaStatus();
  }, [checkMfaStatus]);

  const handleStartSetup = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await mfaSetup();
      setQrCodeUrl(res.qr_code_url);
      setSecretKey(res.secret);
      setSetupStep("scan");
    } catch (err: any) {
      console.error("Error setting up MFA:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to start MFA setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await mfaConfirm(otpCode);
      setMfaStatus("enabled");
      setSetupStep("idle");
      setOtpCode("");
      setQrCodeUrl("");
      setSecretKey("");
    } catch (err: any) {
      console.error("Error confirming MFA:", err);
      setError(err?.response?.data?.detail || err?.message || "Invalid verification code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;

    if (!confirmingDisable) {
      setConfirmingDisable(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await mfaDisable(otpCode);
      setMfaStatus("disabled");
      setOtpCode("");
      setSetupStep("idle");
      setConfirmingDisable(false);
    } catch (err: any) {
      console.error("Error disabling MFA:", err);
      setError(err?.response?.data?.detail || err?.message || "Invalid verification code. Could not disable MFA.");
      setConfirmingDisable(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSetup = () => {
    setSetupStep("idle");
    setQrCodeUrl("");
    setSecretKey("");
    setOtpCode("");
    setError(null);
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secretKey);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy secret key:", err);
      setError("Couldn't copy to clipboard — you can still select and copy the key manually.");
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
        <span className="text-[10px] font-mono">Querying security profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left font-sans select-text">

      {/* Header */}
      <div className="border-b border-[#1c2230]/40 pb-2">
        <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-[#FF9D4D]" />
          <span>Security & Two-Factor Authentication (2FA)</span>
        </h3>
        <p className="text-[10px] text-gray-500">
          Protect your account with an additional layer of verification using TOTP codes.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10.5px] font-mono flex items-start justify-between gap-2 select-text"
        >
          <span className="flex-grow">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="text-rose-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* STATUS UNKNOWN — the profile check failed, so we can't safely claim MFA is on or off */}
      {mfaStatus === "unknown" && statusCheckFailed ? (
        <div className="p-4 bg-gray-500/5 border border-gray-500/15 rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-8 h-8 text-gray-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Security Status Unavailable</h4>
              <p className="text-[10px] text-gray-400 leading-normal">
                We couldn't confirm your current 2FA status. To avoid showing incorrect security information, setup and disable options are hidden until this is resolved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={checkMfaStatus}
            className="px-4 py-2 bg-[#141822] hover:bg-[#1b212f] border border-[#1c2230] text-gray-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : mfaStatus === "enabled" ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Two-Factor Authentication is Enabled</h4>
              <p className="text-[10px] text-gray-400 leading-normal">
                Your account is protected. You will be prompted to enter a 6-digit verification code from your authenticator app every time you log in to ChunkWiser.
              </p>
            </div>
          </div>

          {/* Disable Form */}
          <form onSubmit={handleDisableMfa} className="bg-[#10141B] border border-[#1c2230] p-4 rounded-2xl space-y-4">
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Disable 2FA</h4>
              <p className="text-[9.5px] text-gray-500">Enter a code from your authenticator app to disable TOTP security.</p>
            </div>

            {confirmingDisable && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300 flex items-start justify-between gap-2">
                <span>Disabling 2FA will make your account less secure. Submit again to confirm.</span>
                <button
                  type="button"
                  onClick={() => setConfirmingDisable(false)}
                  aria-label="Cancel disable"
                  className="text-amber-300 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1.5 flex-grow max-w-[200px]">
                <label htmlFor="disable-otp" className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500">
                  6-Digit Code
                </label>
                <input
                  id="disable-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setConfirmingDisable(false);
                  }}
                  className="w-full px-3 py-1.5 bg-[#0C0F16] border border-[#1c2230] rounded-xl text-xs font-mono text-center tracking-widest text-white placeholder-gray-700 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpCode.length !== 6}
                aria-busy={isSubmitting}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-500/5 disabled:opacity-50 disabled:cursor-not-allowed h-9 shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Disabling...</span>
                  </>
                ) : (
                  <>
                    <ShieldX className="w-3.5 h-3.5" />
                    <span>{confirmingDisable ? "Confirm Disable" : "Disable 2FA"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : mfaStatus === "disabled" ? (
        /* MFA INACTIVE SETUP WIDGETS */
        <div className="space-y-4">
          {setupStep === "idle" ? (
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-8 h-8 text-amber-500/80 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Two-Factor Authentication is Disabled</h4>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Secure your account today. MFA prevents unauthorized access even if your password or token is stolen.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartSetup}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="px-4 py-2 bg-[#FF9D4D] hover:bg-[#FFB073] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0D12] font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#FF9D4D]/5 self-start"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Configure 2FA Code</span>}
              </button>
            </div>
          ) : (
            <div className="bg-[#10141B] border border-[#1c2230] p-4 rounded-2xl space-y-5 animate-fade-in relative">

              {/* Reset Setup */}
              <button
                type="button"
                onClick={resetSetup}
                aria-label="Cancel setup"
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white rounded-lg hover:bg-[#141822] cursor-pointer"
                title="Cancel Setup"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">Configure Authenticator App</h4>

              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6 items-start">

                {/* QR Code */}
                <div className="bg-white p-2.5 rounded-xl flex items-center justify-center shrink-0 border border-gray-200 shadow-lg mx-auto sm:mx-0 max-w-[140px]">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Scan this QR code with your authenticator app to link your account" className="w-full h-auto select-none" />
                  ) : (
                    <div className="w-[120px] h-[120px] bg-gray-100 animate-pulse rounded-lg" aria-hidden="true" />
                  )}
                </div>

                {/* Scan Steps */}
                <div className="space-y-4 text-[10.5px] leading-relaxed text-gray-300">
                  <div className="space-y-1">
                    <p className="font-bold text-white">1. Scan the QR Code</p>
                    <p className="text-gray-400">
                      Open your authenticator app (e.g. Google Authenticator, Authy, or 1Password) and scan the QR code.
                    </p>
                  </div>

                  {secretKey && (
                    <div className="space-y-1.5">
                      <p className="font-bold text-white">Or enter the secret key manually:</p>
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 p-2 bg-[#0c0f16] border border-[#222834] rounded-lg text-white font-mono text-[10px] select-all break-all tracking-wider text-center font-semibold">
                          {secretKey}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          aria-label="Copy secret key to clipboard"
                          title="Copy to clipboard"
                          className="p-2 rounded-lg border border-[#222834] text-gray-400 hover:text-white hover:bg-[#141822] transition-colors cursor-pointer shrink-0"
                        >
                          {secretCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Verify OTP Code */}
              <form onSubmit={handleConfirmSetup} className="border-t border-[#1c2230]/40 pt-4 flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-1.5 flex-grow max-w-[200px]">
                  <label htmlFor="setup-otp" className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-500">
                    2. Enter Authenticator Code
                  </label>
                  <input
                    id="setup-otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full px-3 py-1.5 bg-[#0C0F16] border border-[#1c2230] rounded-xl text-xs font-mono text-center tracking-widest text-white placeholder-gray-700 focus:outline-none focus:border-[#FF9D4D]/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6}
                  aria-busy={isSubmitting}
                  className="px-4 py-2 bg-[#FF9D4D] hover:bg-[#FFB073] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0D12] font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#FF9D4D]/5 h-9 shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Enable</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

            </div>
          )}
        </div>
      ) : null}

    </div>
  );
}