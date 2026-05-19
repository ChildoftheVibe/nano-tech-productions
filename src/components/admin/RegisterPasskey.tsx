"use client";

import { useState } from "react";

export function RegisterPasskey() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function register() {
    setStatus("loading");
    setMessage(null);
    try {
      const optRes = await fetch("/api/admin/auth/webauthn/register-options", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!optRes.ok) throw new Error("Could not generate registration options");
      const options = await optRes.json();

      const { startRegistration } = await import("@simplewebauthn/browser");
      const regResult = await startRegistration({ optionsJSON: options });

      const verRes = await fetch("/api/admin/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(regResult),
      });
      if (!verRes.ok) throw new Error("Verification failed");

      setStatus("success");
      setMessage("Passkey registered — you can now sign in with Face ID or your phone password.");
    } catch (err) {
      setStatus("error");
      if (err instanceof Error && err.name === "NotAllowedError") {
        setMessage("Registration was cancelled.");
      } else if (err instanceof Error && err.name === "InvalidStateError") {
        setMessage("This device is already registered.");
      } else {
        setMessage("Registration failed. Make sure your device supports biometrics.");
      }
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#222121] p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-white/50">
        Biometric Login
      </div>
      <p className="mt-2 text-sm text-white/60">
        Register this device to sign in with Face ID or your phone password instead of a password.
      </p>
      {message && (
        <p
          className={`mt-3 text-sm ${
            status === "success" ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={register}
        disabled={status === "loading" || status === "success"}
        className="mt-4 rounded border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
      >
        {status === "loading"
          ? "Registering…"
          : status === "success"
          ? "Registered"
          : "Register Passkey"}
      </button>
    </div>
  );
}
