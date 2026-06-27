"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/** Only allow redirects to internal /admin paths — never external URLs. */
function sanitizeRedirect(raw: string | null): string {
  if (!raw) return "/admin";
  try {
    // If it parses as an absolute URL it's external → reject.
    new URL(raw);
    return "/admin";
  } catch {
    // Relative path — must start with /admin.
    return raw.startsWith("/admin") ? raw : "/admin";
  }
}

export default function AdminLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const safeRedirect = sanitizeRedirect(search.get("redirect"));

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(
          json.error === "rate_limited"
            ? "Too many attempts — try again in 15 minutes."
            : "Invalid password",
        );
        return;
      }
      router.replace(safeRedirect);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function onBiometricLogin() {
    setBiometricLoading(true);
    setError(null);
    try {
      const optRes = await fetch("/api/admin/auth/webauthn/auth-options", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!optRes.ok) {
        setError("Biometric login is not set up yet. Use your password first.");
        return;
      }
      const options = await optRes.json();

      const { startAuthentication } = await import("@simplewebauthn/browser");
      const authResult = await startAuthentication({ optionsJSON: options });

      const verRes = await fetch("/api/admin/auth/webauthn/auth-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(authResult),
      });
      if (!verRes.ok) {
        setError("Biometric authentication failed.");
        return;
      }
      router.replace(safeRedirect);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Biometric authentication was cancelled.");
      } else if (err instanceof Error && err.name === "NotSupportedError") {
        setError("Biometric authentication is not supported on this device.");
      } else {
        setError("Biometric authentication failed. Use your password instead.");
      }
    } finally {
      setBiometricLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1919] p-8 text-white">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-white/10 bg-[#222121] p-8 shadow-xl"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold tracking-wider text-[#3DD6C8]">
              NTV
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-white/50">
              Admin
            </span>
          </div>
          <p className="text-sm text-white/60">Sign in to manage the catalog.</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/60">
            Password
          </span>
          <input
            type="password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded border border-white/15 bg-[#121212]/30 px-3 py-2 outline-none focus:border-[#3DD6C8]"
          />
        </label>

        {error && (
          <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded bg-[#3DD6C8] py-2.5 font-medium text-[#121212] transition-opacity disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/30">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={onBiometricLogin}
          disabled={biometricLoading}
          className="flex w-full items-center justify-center gap-2 rounded border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {biometricLoading ? (
            "Authenticating…"
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.954 11.954 0 0 0 10.5 10.5a3.5 3.5 0 1 1 7 0c0 .684-.1 1.345-.28 1.97M5.004 12.682a7.47 7.47 0 0 1-.004-.182A7.5 7.5 0 0 1 15.75 5.25l.003.003"
                />
              </svg>
              Sign in with Face ID / Phone Password
            </>
          )}
        </button>
      </form>
    </main>
  );
}
