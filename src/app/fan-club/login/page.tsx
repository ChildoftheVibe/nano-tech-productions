"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Lock } from "lucide-react";

type FormStatus = "idle" | "loading" | "error" | "soon" | "rate_limited";

export default function FanClubLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/fan-club/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 429) {
        setStatus("rate_limited");
        return;
      }
      if (res.status === 503) {
        setStatus("soon");
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setErrorMsg(json.error ?? "Invalid credentials.");
        setStatus("error");
        return;
      }

      // TODO: redirect to /fan-club dashboard when implemented
    } catch {
      setErrorMsg("Unable to connect. Try again.");
      setStatus("error");
    }
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
            style={{ fontSize: "clamp(2.4rem, 8vw, 4rem)", letterSpacing: "0.16em", lineHeight: 1 }}
          >
            NANO<br />TECHIANS
          </h1>
          <div className="mx-auto mt-5 h-px w-8 bg-[#3DD6C8]/30" />
          <p className="mt-4 font-mono text-xs tracking-widest text-white/25 uppercase">
            The inner circle
          </p>
        </motion.div>

        {/* card area */}
        <motion.div
          className="w-full max-w-[360px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.12 }}
        >
          <AnimatePresence mode="wait">
            {status === "soon" || status === "rate_limited" ? (
              <motion.div
                key="soon"
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
                  <span className="font-mono text-lg text-[#3DD6C8]/70">◈</span>
                </div>
                <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#3DD6C8]">
                  {status === "rate_limited" ? "Slow Down" : "Coming Soon"}
                </h2>
                <p className="text-sm leading-relaxed text-white/40">
                  {status === "rate_limited"
                    ? "Too many attempts. Take a breath and try again in 15 minutes."
                    : "The Nano Techians Fan Club is launching soon. Membership opens exclusively to existing customers and early supporters."}
                </p>
                {status === "soon" && (
                  <a
                    href="mailto:membership@nanotechvibe.com"
                    className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-[#3DD6C8]/40 underline underline-offset-4 transition-colors hover:text-[#3DD6C8]/70"
                  >
                    Request access
                  </a>
                )}
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 block w-full font-mono text-[10px] uppercase tracking-widest text-white/20 transition-colors hover:text-white/45"
                >
                  ← Back
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={onSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                <div
                  className="rounded-2xl border border-white/[0.07] p-6 space-y-4"
                  style={{ background: "rgba(255,255,255,0.025)" }}
                >
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
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full rounded-lg border border-white/[0.09] bg-black/50 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#3DD6C8]/40 focus:bg-black/60"
                    />
                  </label>
                </div>

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
                  disabled={status === "loading" || !email || !password}
                  className="w-full rounded-full py-3 font-mono text-sm font-bold uppercase tracking-[0.18em] text-black disabled:opacity-40"
                  style={{ background: "#3DD6C8" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {status === "loading" ? "Verifying…" : "Enter"}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-7 text-center font-mono text-[10px] text-white/18 tracking-wider">
            Not a member?{" "}
            <a
              href="mailto:membership@nanotechvibe.com"
              className="text-[#3DD6C8]/35 underline underline-offset-4 transition-colors hover:text-[#3DD6C8]/65"
            >
              Request access
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
