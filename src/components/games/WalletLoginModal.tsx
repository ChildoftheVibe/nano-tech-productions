"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, ShieldCheck, X } from "lucide-react";
import { useWalletStore } from "@/store/walletStore";

type Step = "email" | "code";

/**
 * Gates casino play behind a verified email claim on the visitor's wallet.
 * Two steps: email (+ optional display name, marketing-list opt-out) sends a
 * 6-digit code; entering the code confirms and attaches the email. Not a
 * password account — it just verifies an identity on the existing anonymous
 * wallet.
 */
export function WalletLoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [subscribe, setSubscribe] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const setEmailInStore = useWalletStore((s) => s.setEmail);

  const requestCode = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/verify/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "email_unconfigured"
            ? "email sending is unavailable right now"
            : String(data.error ?? "request_failed").replace(/_/g, " "),
        );
        return;
      }
      setStep("code");
    } catch {
      setError("network error");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCode = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/wallet/verify/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          displayName: displayName.trim() || undefined,
          subscribe,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(String(data.error ?? "confirm_failed").replace(/_/g, " "));
        return;
      }
      setEmailInStore(data.email);
      onSuccess();
    } catch {
      setError("network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel relative w-full max-w-sm rounded-xl p-5"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-[#dde4e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
          >
            <X size={16} aria-hidden="true" />
          </button>

          {step === "email" ? (
            <>
              <h2 className="mb-1 flex items-center gap-2 font-[family-name:var(--font-bungee)] text-base tracking-tight text-[#62f3e4]">
                <Mail size={16} aria-hidden="true" /> Log In to Play
              </h2>
              <p className="mb-4 text-xs text-on-surface-variant">
                The casino floor requires a verified email so your Nano Bucks stay tied to you.
                We&apos;ll send a 6-digit code — no password.
              </p>

              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email"
                  autoFocus
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] px-3 py-2.5 text-sm text-[#dde4e2] placeholder:text-[#8a938f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
                />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name (optional)"
                  aria-label="Display name"
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] px-3 py-2.5 text-sm text-[#dde4e2] placeholder:text-[#8a938f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
                />

                <label className="mt-1 flex items-start gap-2 text-[11px] leading-snug text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={subscribe}
                    onChange={(e) => setSubscribe(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#62f3e4]"
                  />
                  <span>
                    Add me to the <span className="text-[#dde4e2]">marketing email list</span> for
                    drops, perks, and updates. You can opt out any time — uncheck this box now, or
                    unsubscribe from any email later.
                  </span>
                </label>

                {error && <p className="text-xs font-medium text-red-400">{error}</p>}
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={submitting || !email.trim()}
                  className="mt-1 flex min-h-11 items-center justify-center rounded-lg bg-[#62f3e4] px-4 text-xs font-bold tracking-wide text-[#003733] uppercase transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:opacity-40"
                >
                  {submitting ? "Sending code…" : "Send Code"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-1 flex items-center gap-2 font-[family-name:var(--font-bungee)] text-base tracking-tight text-[#62f3e4]">
                <ShieldCheck size={16} aria-hidden="true" /> Enter Your Code
              </h2>
              <p className="mb-4 text-xs text-on-surface-variant">
                We sent a 6-digit code to <span className="text-[#dde4e2]">{email.trim()}</span>.
                Enter it below to finish logging in.
              </p>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  aria-label="6-digit code"
                  autoFocus
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-[#dde4e2] placeholder:text-[#8a938f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
                />
                {error && <p className="text-xs font-medium text-red-400">{error}</p>}
                <button
                  type="button"
                  onClick={() => void confirmCode()}
                  disabled={submitting || code.length !== 6}
                  className="mt-1 flex min-h-11 items-center justify-center rounded-lg bg-[#62f3e4] px-4 text-xs font-bold tracking-wide text-[#003733] uppercase transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:opacity-40"
                >
                  {submitting ? "Verifying…" : "Verify & Log In"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                  }}
                  className="flex items-center justify-center gap-1 py-1.5 text-[11px] text-on-surface-variant hover:text-[#dde4e2]"
                >
                  <ArrowLeft size={12} aria-hidden="true" /> Use a different email
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
