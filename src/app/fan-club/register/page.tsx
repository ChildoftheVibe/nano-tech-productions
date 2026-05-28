"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Lock, User } from "lucide-react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

type FormStatus = "idle" | "loading" | "error" | "success";

export default function FanClubRegisterPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: `${origin}/fan-club/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message ?? "Could not create account. Try again.");
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  async function onGoogleSignIn() {
    setStatus("loading");
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/fan-club/auth/callback`,
      },
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "#080808" }}
    >
      {/* atmospheric teal glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 720,
          height: 480,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(61,214,200,0.10) 0%, transparent 68%)",
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
          <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.45em] text-[#3DD6C8]/50">
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
          <div className="mx-auto mt-5 h-px w-8 bg-[#3DD6C8]/30" />
          <p className="mt-4 font-mono text-xs tracking-widest text-white/25 uppercase">
            Create Account
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
            {status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="rounded-2xl border border-[#3DD6C8]/15 p-8 text-center"
                style={{ background: "rgba(61,214,200,0.03)" }}
              >
                <div
                  className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#3DD6C8]/20"
                  style={{ background: "rgba(61,214,200,0.06)" }}
                >
                  <span className="font-mono text-lg text-[#3DD6C8]/70">✓</span>
                </div>
                <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#3DD6C8]">
                  Check Your Email
                </h2>
                <p className="text-sm leading-relaxed text-white/40">
                  We sent a confirmation link to{" "}
                  <span className="text-white/60">{email}</span>. Click it to
                  activate your membership.
                </p>
                <Link
                  href="/fan-club/login"
                  className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-[#3DD6C8]/40 underline underline-offset-4 transition-colors hover:text-[#3DD6C8]/70"
                >
                  Back to Sign In
                </Link>
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
                <div
                  className="rounded-2xl border border-white/[0.07] p-6 space-y-3"
                  style={{ background: "rgba(255,255,255,0.025)" }}
                >
                  {/* Google OAuth */}
                  <motion.button
                    type="button"
                    onClick={onGoogleSignIn}
                    disabled={status === "loading"}
                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/[0.12] bg-white/[0.05] py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.09] disabled:opacity-40"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
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
                    Sign up with Google
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
                        <User size={9} aria-hidden="true" />
                        Display Name
                      </span>
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-lg border border-white/[0.09] bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#3DD6C8]/40 focus:bg-black/60"
                      />
                    </label>

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
                        className="w-full rounded-lg border border-white/[0.09] bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#3DD6C8]/40 focus:bg-black/60"
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
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full rounded-lg border border-white/[0.09] bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#3DD6C8]/40 focus:bg-black/60"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
                        <Lock size={9} aria-hidden="true" />
                        Confirm Password
                      </span>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full rounded-lg border border-white/[0.09] bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#3DD6C8]/40 focus:bg-black/60"
                      />
                    </label>

                    <AnimatePresence>
                      {status === "error" && errorMsg && (
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
                      disabled={
                        status === "loading" ||
                        !displayName ||
                        !email ||
                        !password ||
                        !confirmPassword
                      }
                      className="w-full rounded-full py-3 font-mono text-sm font-bold uppercase tracking-[0.18em] text-black disabled:opacity-40"
                      style={{ background: "#3DD6C8" }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {status === "loading" ? "Creating…" : "Create Account"}
                    </motion.button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-7 text-center font-mono text-[10px] tracking-wider text-white/18">
            Already a member?{" "}
            <Link
              href="/fan-club/login"
              className="text-[#3DD6C8]/35 underline underline-offset-4 transition-colors hover:text-[#3DD6C8]/65"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
