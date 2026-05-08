"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get("redirect") ?? "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
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
      router.replace(redirectTo);
      router.refresh();
    } finally {
      setSubmitting(false);
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
              NTP
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
            className="w-full rounded border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-[#3DD6C8]"
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
          className="w-full rounded bg-[#3DD6C8] py-2.5 font-medium text-black transition-opacity disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
