"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Coins, Gamepad2, Play, Send, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { CASINO_COMPONENTS } from "@/components/games/casino";
import { ARCADE_COMPONENTS } from "@/components/games/arcade";
import { GAME_ART, HUB_HERO_ART } from "@/components/games/art";
import { settleGame, startGame } from "@/components/games/gameApi";
import { useWalletStore } from "@/store/walletStore";
import { useGameKeyboardLock } from "@/store/gameFocusStore";

/** Nano Tech Games hub: casino floor + arcade cabinet + wallet tools. */

type CasinoMeta = { id: string; name: string; tagline: string; stakes: string };

const CASINO_META: CasinoMeta[] = [
  { id: "blackjack", name: "Blackjack", tagline: "Hit 21 · blackjack pays 3:2", stakes: "5-500 NB" },
  { id: "roulette", name: "Roulette", tagline: "Straight-up pays 35:1", stakes: "1-250 NB" },
  { id: "craps", name: "Craps", tagline: "Ride the pass line", stakes: "5-250 NB" },
  { id: "holdem", name: "Texas Hold'em", tagline: "Heads-up vs the house", stakes: "5-250 NB" },
  { id: "slots", name: "Nano Slots", tagline: "Three portals pay 100×", stakes: "1-100 NB" },
  { id: "pokeno", name: "Pokeno", tagline: "Poker meets bingo", stakes: "5-100 NB" },
  { id: "casino-wild", name: "Casino Wild", tagline: "Shed cards, stack bonuses", stakes: "5-200 NB" },
  { id: "dominoes", name: "Casino Dominoes", tagline: "Block the house", stakes: "5-200 NB" },
  { id: "video-poker", name: "Video Poker", tagline: "9/6 Jacks or Better", stakes: "1-100 NB" },
  { id: "card-flip", name: "Card Flip Duel", tagline: "High card takes it", stakes: "1-500 NB" },
  { id: "three-card-monte", name: "3-Card Monte", tagline: "Follow the queen", stakes: "5-200 NB" },
];

/** Live Lounge game card: art with a stake/type badge, title, tagline, and a
 *  Play affordance that reads as a real button (visible on touch, spotlit on
 *  hover). */
function GameTile({
  id,
  name,
  tagline,
  badge,
  accent = "#62f3e4",
  index,
  onOpen,
}: {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  accent?: string;
  index: number;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { delay: Math.min(index * 0.04, 0.5), duration: 0.4, ease: "easeOut" }}
      whileHover={reduce ? undefined : { y: -6 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className="glass-card group relative flex flex-col overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f0e]"
      aria-label={`Play ${name}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- local static art, already webp-optimized */}
        <img
          src={GAME_ART[id]}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1110] via-[#0b1110]/10 to-transparent" />
        {/* Stake / type badge */}
        <span
          className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 font-[family-name:var(--font-mono,monospace)] text-[10px] font-bold tracking-wide backdrop-blur-sm"
          style={{ background: "rgba(9,15,14,0.72)", color: accent, border: `1px solid ${accent}55` }}
        >
          {badge}
        </span>
      </div>
      <div className="flex flex-1 items-end justify-between gap-2 px-3 pt-2.5 pb-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-bold text-[#dde4e2]">{name}</span>
          <span className="truncate text-[11px] text-on-surface-variant">{tagline}</span>
        </span>
        {/* Play pill: always visible (ADA + touch), spotlit on hover. */}
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110"
          style={{ background: accent, color: "#003733", boxShadow: `0 0 14px ${accent}66` }}
          aria-hidden="true"
        >
          <Play size={14} fill="currentColor" />
        </span>
      </div>
    </motion.button>
  );
}

export function GamesHubClient() {
  const [active, setActive] = useState<string | null>(null);
  const [arcadeActive, setArcadeActive] = useState<string | null>(null);
  const [arcadeSession, setArcadeSession] = useState<string | null>(null);
  const [arcadeMsg, setArcadeMsg] = useState("");
  const balance = useWalletStore((s) => s.balance);
  const walletCode = useWalletStore((s) => s.walletCode);
  const lifetimeEarned = useWalletStore((s) => s.lifetimeEarned);
  const refresh = useWalletStore((s) => s.refresh);

  // Transfer form.
  const [toCode, setToCode] = useState("");
  const [amount, setAmount] = useState("");
  const [transferMsg, setTransferMsg] = useState("");

  // Lock media keys while an arcade cabinet is open (casino tables lock via
  // their own GameShell).
  useGameKeyboardLock(!!arcadeActive);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ActiveCasino = active ? CASINO_COMPONENTS[active] : null;
  const activeArcade = arcadeActive ? ARCADE_COMPONENTS[arcadeActive] : null;

  // Jump the viewport to the top so the opened game is framed in the window
  // rather than wherever the grid was scrolled to.
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const openCasino = (id: string) => {
    scrollToTop();
    setActive(id);
  };

  const openArcade = async (id: string) => {
    scrollToTop();
    setArcadeActive(id);
    setArcadeMsg("");
    try {
      const { sessionId } = await startGame(id, 0);
      setArcadeSession(sessionId);
    } catch {
      setArcadeSession(null);
    }
  };

  const finishArcade = async (won: boolean) => {
    if (arcadeSession) {
      try {
        const res = await settleGame(arcadeSession, { won });
        setArcadeMsg(
          res.payout > 0 ? `+${res.payout} NB earned!` : "Daily arcade cap reached. No NB this round.",
        );
      } catch {
        setArcadeMsg("");
      }
      setArcadeSession(null);
    }
  };

  const sendTransfer = async () => {
    setTransferMsg("");
    const res = await fetch("/api/wallet/transfer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toCode: toCode.trim(), amount: Number(amount) }),
    });
    const data = await res.json();
    if (res.ok) {
      setTransferMsg(`Sent ${data.sent} NB!`);
      setToCode("");
      setAmount("");
      void refresh();
    } else {
      setTransferMsg(String(data.error ?? "transfer failed").replace(/_/g, " "));
    }
  };

  if (ActiveCasino || activeArcade) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-2xl flex-col gap-4 px-4 py-6">
        <button
          type="button"
          onClick={() => {
            if (arcadeSession) void finishArcade(false);
            setActive(null);
            setArcadeActive(null);
          }}
          className="flex w-fit items-center gap-1.5 rounded text-xs font-semibold tracking-wide text-[#bbcac6] uppercase transition-colors hover:text-[#62f3e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
        >
          <ArrowLeft size={14} aria-hidden="true" /> All games
        </button>
        {/* Center the opened game vertically in the remaining viewport. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active ?? arcadeActive ?? "table"}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col justify-center"
          >
            {ActiveCasino && <ActiveCasino />}
            {activeArcade && arcadeActive && (
              <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a2120] p-5">
                {/* Ambient art backdrop for the arcade cabinet */}
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.14] blur-sm"
                  style={{ backgroundImage: `url(${GAME_ART[arcadeActive]})` }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <h2 className="mb-1 font-[family-name:var(--font-bungee)] text-base tracking-tight text-[#62f3e4]">
                    {activeArcade.name}
                  </h2>
                  <p className="mb-4 text-xs text-[#bbcac6]">{activeArcade.instructions}</p>
                  <activeArcade.Component onFinish={finishArcade} />
                  {arcadeMsg && (
                    <motion.p
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 text-center text-sm font-bold text-[#62f3e4]"
                      role="status"
                    >
                      {arcadeMsg}
                    </motion.p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  const fmt = (n: number | null) => (n === null ? "…" : n.toLocaleString());

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* ───────────────────────── Hero header ───────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-5 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] teal-glow"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local static art */}
        <img
          src={HUB_HERO_ART}
          alt=""
          className="animate-drift absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090f0e] via-[#090f0e]/85 to-[#090f0e]/40" />
        <div className="relative flex flex-col gap-3 px-5 py-7 sm:px-8 sm:py-10">
          <h1 className="font-[family-name:var(--font-bungee)] text-3xl tracking-tight text-[#62f3e4] sm:text-4xl">
            Nano Tech Games
          </h1>
          <p className="max-w-lg text-sm text-on-surface-variant">
            Win <span className="font-bold text-[#62f3e4]">Nano Bucks</span> at the tables and in
            the arcade, then spend them on album and track downloads. NB never converts to cash; it
            only unlocks music.
          </p>
        </div>
      </motion.header>

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { icon: Coins, label: "Your Balance", value: `${fmt(balance)} NB`, tone: "#62f3e4" },
          { icon: TrendingUp, label: "Lifetime Earned", value: `${fmt(lifetimeEarned)} NB`, tone: "#ffabef" },
          { icon: Sparkles, label: "Games", value: `${CASINO_META.length + Object.keys(ARCADE_COMPONENTS).length}`, tone: "#f0c674" },
        ].map((s) => (
          <div key={s.label} className="glass-panel flex flex-col gap-1 rounded-xl px-4 py-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] text-on-surface-variant uppercase">
              <s.icon size={12} aria-hidden="true" style={{ color: s.tone }} /> {s.label}
            </span>
            <span
              className="font-[family-name:var(--font-mono,monospace)] text-lg font-bold tabular-nums sm:text-xl"
              style={{ color: s.tone }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ─────────────────── Main + rail ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {/* Casino floor */}
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-[family-name:var(--font-bungee)] text-lg tracking-tight text-[#dde4e2]">
              Casino Floor
            </h2>
            <span className="text-[11px] text-on-surface-variant">Stake NB · beat the house</span>
          </div>
          <div className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CASINO_META.map((g, i) => (
              <GameTile
                key={g.id}
                id={g.id}
                name={g.name}
                tagline={g.tagline}
                badge={g.stakes}
                index={i}
                onOpen={() => openCasino(g.id)}
              />
            ))}
          </div>

          {/* Arcade cabinet */}
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-bungee)] text-lg tracking-tight text-[#dde4e2]">
              <Gamepad2 size={18} className="text-[#ffabef]" aria-hidden="true" /> Arcade Cabinet
            </h2>
            <span className="text-[11px] text-on-surface-variant">Free · win 25 NB</span>
          </div>
          <p className="mb-3 text-xs text-ntv-muted">
            Free to play: win 25 NB, finish 5 NB (up to 12 rewards a day). These are the same
            challenges guarding the album portals.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(ARCADE_COMPONENTS).map(([id, g], i) => (
              <GameTile
                key={id}
                id={id}
                name={g.name}
                tagline={g.instructions.split(".")[0]}
                badge="FREE"
                accent="#ffabef"
                index={i}
                onOpen={() => void openArcade(id)}
              />
            ))}
          </div>
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          {/* Wallet */}
          <div className="glass-panel rounded-xl p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#dde4e2] uppercase">
              <Wallet size={14} className="text-[#62f3e4]" aria-hidden="true" /> Your Wallet
            </h2>
            <p className="font-[family-name:var(--font-mono,monospace)] text-3xl font-bold tabular-nums text-[#62f3e4]">
              {fmt(balance)}
              <span className="ml-1 text-sm text-on-surface-variant">NB</span>
            </p>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">Lifetime earned</dt>
                <dd className="font-[family-name:var(--font-mono,monospace)] tabular-nums text-[#ffabef]">{fmt(lifetimeEarned)} NB</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-on-surface-variant">Wallet code</dt>
                <dd className="font-[family-name:var(--font-mono,monospace)] text-[#dde4e2]">{walletCode ?? "…"}</dd>
              </div>
            </dl>
          </div>

          {/* Send NB */}
          <div className="glass-panel rounded-xl p-4">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#dde4e2] uppercase">
              <Send size={14} className="text-[#62f3e4]" aria-hidden="true" /> Send Nano Bucks
            </h2>
            <p className="mb-3 text-[11px] text-ntv-muted">
              Share NB with a friend using their wallet code.
            </p>
            <div className="flex flex-col gap-2">
              <input
                value={toCode}
                onChange={(e) => setToCode(e.target.value.toUpperCase())}
                placeholder="NTV-XXXXXXXX"
                aria-label="Recipient wallet code"
                className="w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] px-3 py-2.5 font-mono text-xs text-[#dde4e2] placeholder:text-[#8a938f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
              />
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="Amount"
                  inputMode="numeric"
                  aria-label="Amount of Nano Bucks to send"
                  className="min-w-0 flex-1 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] px-3 py-2.5 text-xs text-[#dde4e2] placeholder:text-[#8a938f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
                />
                <button
                  type="button"
                  onClick={() => void sendTransfer()}
                  disabled={!toCode || !Number(amount)}
                  className="flex min-h-11 items-center gap-1.5 rounded-lg bg-[#62f3e4] px-4 text-xs font-bold tracking-wide text-[#003733] uppercase transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:opacity-40"
                >
                  <Send size={13} aria-hidden="true" /> Send
                </button>
              </div>
            </div>
            {transferMsg && (
              <p className="mt-2 text-xs font-semibold text-[#62f3e4]" role="status">{transferMsg}</p>
            )}
          </div>

          {/* House rules */}
          <div className="glass-panel rounded-xl p-4">
            <h2 className="mb-2 text-xs font-bold tracking-[0.08em] text-[#dde4e2] uppercase">House Rules</h2>
            <ul className="space-y-1.5 text-[11px] text-on-surface-variant">
              <li>Nano Bucks are a virtual, closed-loop currency. They never convert to cash.</li>
              <li>Arcade games are free and reward NB. Casino tables stake the NB you set.</li>
              <li>Spend NB to unlock album and track downloads across the Vault.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
