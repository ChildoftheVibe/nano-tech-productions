"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

type FormStatus = "idle" | "loading" | "error" | "rate_limited";

export default function FanClubLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/fan-club";
  const urlError = searchParams.get("error");

  const safeRedirect =
    redirectTo.startsWith("/fan-club") ? redirectTo : "/fan-club";

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    urlError === "auth_failed" ? "Authentication failed. Try again." : null,
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.status === 429) {
        setStatus("rate_limited");
        return;
      }
      setErrorMsg(error.message ?? "Invalid credentials.");
      setStatus("error");
      return;
    }

    router.replace(safeRedirect);
    router.refresh();
  }

  async function onGoogleSignIn() {
    setStatus("loading");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/fan-club/auth/callback`,
      },
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "#080808" }}
    >
      {/* atmospheric teal glow — top-center */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 720,
          height: 480,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(98,243,228,0.10) 0%, transparent 68%)",
        }}
      />

      {/* back link */}
      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/25 transition-colors hover:text-white/55"
      >
        <ArrowLeft size={11} aria-hidden="true" />
        Back to Vault
      </Link>

      <div className="flex min-h-full flex-col items-center justify-center px-6 py-24">

        {/* wordmark */}
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.45em] text-[#62f3e4]/50">
            Nano Tech Vibe
          </div>
          <h1
            className="font-mono font-black text-white"
            style={{
              fontSize: "clamp(2.4rem, 8vw, 4rem)",
              letterSpacing: "0.16em",
              lineHeight: 1,
            }}
          >
            NANO
            <br />
            TECHIANS
          </h1>
          <div className="mx-auto mt-5 h-px w-8 bg-[#62f3e4]/30" />
          <p className="mt-4 font-mono text-xs tracking-widest text-white/25 uppercase">
            The inner circle
          </p>
        </motion.div>

        {/* card area */}
        <motion.div
          className="w-full max-w-[360px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.55,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.12,
          }}
        >
          <AnimatePresence mode="wait">
            {status === "rate_limited" ? (
              <motion.div
                key="rate_limited"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="rounded-2xl border border-[#62f3e4]/15 p-8 text-center"
                style={{ background: "rgba(98,243,228,0.03)" }}
              >
                <div
                  className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#62f3e4]/20"
                  style={{ background: "rgba(98,243,228,0.06)" }}
                >
                  <span className="font-mono text-lg text-[#62f3e4]/70">◈</span>
                </div>
                <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#62f3e4]">
                  Slow Down
                </h2>
                <p className="text-sm leading-relaxed text-white/40">
                  Too many attempts. Take a breath and try again in a moment.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 block w-full font-mono text-[10px] uppercase tracking-widest text-white/20 transition-colors hover:text-white/45"
                >
                  ← Back
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {/* Google OAuth */}
                <div
                  className="rounded-2xl border border-white/[0.07] p-6 space-y-3"
                  style={{ background: "rgba(255,255,255,0.025)" }}
                >
                  <motion.button
                    type="button"
                    onClick={onGoogleSignIn}
                    disabled={status === "loading"}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/[0.12] bg-white/[0.05] py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.09] disabled:opacity-40"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* Google icon */}
                    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
                      <path
                        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                        fill="#4285F4"
                      />
                      <path
                        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                        fill="#34A853"
                      />
                      <path
                        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </motion.button>
                  <p className="text-center font-mono text-[9px] italic leading-relaxed text-white/25">
                    ⚠ Google sign-in requires setup — owner must configure OAuth
                    credentials in Supabase dashboard before this works.
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.07]" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">
                      or
                    </span>
                    <div className="h-px flex-1 bg-white/[0.07]" />
                  </div>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <label className="block">
                      <span className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
                        <Mail size={9} aria-hidden="true" />
                        Email
                      </span>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-white/[0.09] bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#62f3e4]/40 focus:bg-black/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
                        <Lock size={9} aria-hidden="true" />
                        Password
                      </span>
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••"
                        className="w-full rounded-lg border border-white/[0.09] bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#62f3e4]/40 focus:bg-black/60"
                      />
                    </label>

                    <AnimatePresence>
                      {(status === "error" || urlError) && errorMsg && (
                        <motion.p
                          key="err"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-4 py-2.5 text-sm text-red-300/70"
                        >
                          {errorMsg}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={status === "loading" || !email || !password}
                      className="w-full rounded-full py-3 font-mono text-sm font-bold uppercase tracking-[0.18em] text-black disabled:opacity-40"
                      style={{ background: "#62f3e4" }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {status === "loading" ? "Verifying…" : "Enter"}
                    </motion.button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-7 text-center font-mono text-[10px] tracking-wider text-white/18">
            New here?{" "}
            <Link
              href="/fan-club/register"
              className="text-[#62f3e4]/35 underline underline-offset-4 transition-colors hover:text-[#62f3e4]/65"
            >
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
