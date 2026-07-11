"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bolt, Coins, Gamepad2, Home, Play, Spade, Wallet } from "lucide-react";
import { ARCADE_COMPONENTS } from "@/components/games/arcade";
import { GAME_ART } from "@/components/games/art";
import { settleGame, startGame } from "@/components/games/gameApi";
import { useWalletStore } from "@/store/walletStore";
import { useGameKeyboardLock } from "@/store/gameFocusStore";
import { GAME_GUIDES } from "@/components/games/guides";
import { HowToPlayButton, HowToPlayPanels } from "@/components/games/HowToPlay";

/** Standalone arcade destination styled after the Neon Arcade desktop
 *  reference. This is the single entry point for the free arcade cabinet
 *  games; the /games hub links its arcade tiles here. Casino tables stay in
 *  /games. Because a game is launched here (not from a vault portal), each one
 *  receives onPlayAgain/onReturn and shows the end-of-game actions. */

const ARCADE_IDS = Object.keys(ARCADE_COMPONENTS);
// Featured slot: Star Vanguard leads (it carries the new ship sprite).
const FEATURED_ID = ARCADE_IDS.includes("star-vanguard") ? "star-vanguard" : ARCADE_IDS[0];

const fmt = (n: number | null) => (n === null ? "…" : n.toLocaleString());

/** Neon Arcade game card: art with a FREE badge, title, one-line objective,
 *  and a centered play affordance that spotlights on hover. */
function ArcadeCard({
  id,
  index,
  onOpen,
}: {
  id: string;
  index: number;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const game = ARCADE_COMPONENTS[id];
  const objective = game.instructions.split(".")[0];
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { delay: Math.min(index * 0.05, 0.4), duration: 0.4, ease: "easeOut" }}
      whileHover={reduce ? undefined : { y: -6 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      className="glass-panel group relative flex flex-col overflow-hidden rounded-2xl p-3 text-left transition-colors hover:border-[#62f3e4]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f0e]"
      aria-label={`Play ${game.name}`}
    >
      <div className="relative mb-3 aspect-[4/5] w-full overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- local static art, already webp-optimized */}
        <img
          src={GAME_ART[id]}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1110] via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-[#ffabef] px-3 py-1.5 font-[family-name:var(--font-mono,monospace)] text-[10px] font-bold tracking-tight text-[#551450] uppercase">
          Free
        </span>
        {/* Centered play spotlight on hover. */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "#62f3e4", color: "#003733", boxShadow: "0 0 18px rgba(98,243,228,0.5)" }}
            aria-hidden="true"
          >
            <Play size={20} fill="currentColor" />
          </span>
        </span>
      </div>
      <div className="px-2 pb-2">
        <h3 className="mb-1 text-sm font-bold text-[#dde4e2]">{game.name}</h3>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-on-surface-variant">{objective}</span>
          <span className="shrink-0 font-[family-name:var(--font-mono,monospace)] text-[11px] text-[#62f3e4]">Win 25 NB</span>
        </div>
      </div>
    </motion.button>
  );
}

function ArcadePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deep-link: /arcade?game=<id> opens that game immediately on mount.
  const initialGame = searchParams.get("game");
  const [active, setActive] = useState<string | null>(
    initialGame && ARCADE_COMPONENTS[initialGame] ? initialGame : null,
  );
  const [session, setSession] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [resultMsg, setResultMsg] = useState("");

  const balance = useWalletStore((s) => s.balance);
  const lifetimeEarned = useWalletStore((s) => s.lifetimeEarned);
  const refresh = useWalletStore((s) => s.refresh);

  useGameKeyboardLock(!!active);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scrollToTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  };

  const openArcade = useCallback(async (id: string) => {
    if (!ARCADE_COMPONENTS[id]) return;
    scrollToTop();
    setActive(id);
    setResultMsg("");
    setPlayKey(0);
    try {
      const { sessionId } = await startGame(id, 0);
      setSession(sessionId);
    } catch {
      setSession(null);
    }
  }, []);

  // Start the wallet round for a deep-linked game once on mount. `active` is
  // already seeded from the param above; this only kicks off the async session
  // (no synchronous setState in the effect body).
  useEffect(() => {
    if (!initialGame || !ARCADE_COMPONENTS[initialGame]) return;
    startGame(initialGame, 0)
      .then(({ sessionId }) => setSession(sessionId))
      .catch(() => setSession(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- honour the initial param only
  }, []);

  const finishArcade = useCallback(async (won: boolean) => {
    if (!session) return;
    try {
      const res = await settleGame(session, { won });
      setResultMsg(res.payout > 0 ? `+${res.payout} NB earned!` : "Daily arcade cap reached. No NB this round.");
    } catch {
      setResultMsg("");
    }
    setSession(null);
    void refresh();
  }, [session, refresh]);

  const playAgain = useCallback(async () => {
    if (!active) return;
    setResultMsg("");
    setPlayKey((k) => k + 1);
    try {
      const { sessionId } = await startGame(active, 0);
      setSession(sessionId);
    } catch {
      setSession(null);
    }
  }, [active]);

  const returnToArcade = useCallback(() => {
    setActive(null);
    setSession(null);
    setResultMsg("");
    // Drop the ?game param so a refresh doesn't reopen the game.
    if (searchParams.get("game")) router.replace("/arcade");
  }, [router, searchParams]);

  const ActiveGame = active ? ARCADE_COMPONENTS[active] : null;
  const guide = active ? GAME_GUIDES[active] ?? null : null;

  // ─────────────────────────── Open game view ───────────────────────────
  if (ActiveGame && active) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-3xl flex-col gap-4 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={returnToArcade}
            className="flex w-fit items-center gap-1.5 rounded text-xs font-semibold tracking-wide text-[#bbcac6] uppercase transition-colors hover:text-[#62f3e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Arcade
          </button>
          <HowToPlayButton guide={guide} accent="#ffabef" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col justify-center"
          >
            <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a2120] p-6 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.14] blur-sm"
                style={{ backgroundImage: `url(${GAME_ART[active]})` }}
                aria-hidden="true"
              />
              <div className="relative">
                <h2 className="mb-1 font-[family-name:var(--font-bungee)] text-base tracking-tight text-[#62f3e4]">
                  {ActiveGame.name}
                </h2>
                <p className="mb-4 text-xs text-[#bbcac6]">{ActiveGame.instructions}</p>
                <ActiveGame.Component
                  key={`${active}-${playKey}`}
                  onFinish={finishArcade}
                  onPlayAgain={playAgain}
                  onReturn={returnToArcade}
                />
                {resultMsg && (
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-3 text-center text-sm font-bold text-[#62f3e4]"
                    role="status"
                  >
                    {resultMsg}
                  </motion.p>
                )}
              </div>
            </div>
            {guide && <HowToPlayPanels guide={guide} accent="#ffabef" />}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ─────────────────────────── Arcade landing ───────────────────────────
  const featured = ARCADE_COMPONENTS[FEATURED_ID];
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-10 right-0 -z-10 h-[420px] w-[420px] rounded-full bg-[#62f3e4]/5 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 -z-10 h-[320px] w-[320px] rounded-full bg-[#ffabef]/5 blur-[100px]" aria-hidden="true" />

      {/* Top strip: nav rail + wallet chip (page title lives once, in the hero below) */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Games sections">
            <Link href="/" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-[#242b2a] hover:text-[#62f3e4]">
              <Home size={14} aria-hidden="true" /> Home
            </Link>
            <Link href="/games" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-[#242b2a] hover:text-[#62f3e4]">
              <Spade size={14} aria-hidden="true" /> Casino
            </Link>
            <span className="flex items-center gap-1.5 rounded-lg border-l-2 border-[#62f3e4] bg-[#242b2a]/60 px-3 py-2 text-xs font-bold text-[#62f3e4]" aria-current="page">
              <Gamepad2 size={14} aria-hidden="true" /> Arcade
            </span>
          </nav>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1a2120] px-4 py-2">
          <Wallet size={16} className="text-[#ffabef]" aria-hidden="true" />
          <div className="flex flex-col leading-none">
            <span className="text-[10px] uppercase text-on-surface-variant opacity-70">Balance</span>
            <span className="mt-0.5 font-[family-name:var(--font-mono,monospace)] text-sm font-bold text-[#62f3e4]">{fmt(balance)} NB</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-6 text-center sm:text-left"
      >
        <h1 className="mb-2 font-[family-name:var(--font-bungee)] text-4xl leading-tight tracking-tight text-[#62f3e4] drop-shadow-[0_0_15px_rgba(98,243,228,0.5)] sm:text-5xl">
          Neon Arcade
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:mx-0">
          Free to play, skill-based, and electrified. Beat a cabinet to win{" "}
          <span className="font-semibold text-[#62f3e4]">Nano Bucks</span>, then spend them on album and
          track downloads across the Vault.
        </p>
      </motion.section>

      {/* Featured banner */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
        className="mb-8"
      >
        <div className="glass-panel group relative h-56 w-full overflow-hidden rounded-2xl sm:h-72">
          {/* eslint-disable-next-line @next/next/no-img-element -- local static art */}
          <img
            src={GAME_ART[FEATURED_ID]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090f0e] via-[#090f0e]/70 to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-center gap-3 px-6 sm:px-8">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#ffabef]/30 bg-[#ffabef]/20 px-3 py-1 text-[10px] font-bold tracking-widest text-[#ffabef] uppercase">
              <Bolt size={13} aria-hidden="true" /> Featured
            </span>
            <h3 className="font-[family-name:var(--font-bungee)] text-2xl tracking-tight text-[#dde4e2] sm:text-3xl">
              {featured.name}
            </h3>
            <p className="max-w-md text-xs text-on-surface-variant sm:text-sm">{featured.instructions}</p>
            <button
              type="button"
              onClick={() => void openArcade(FEATURED_ID)}
              className="teal-glow-hover mt-1 flex w-fit items-center gap-2 rounded-xl bg-[#62f3e4] px-6 py-3 text-xs font-bold tracking-[0.06em] text-[#003733] uppercase transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f0e]"
            >
              <Play size={16} fill="currentColor" aria-hidden="true" /> Play Now
            </button>
          </div>
        </div>
      </motion.section>

      {/* Game grid */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h4 className="font-[family-name:var(--font-bungee)] text-lg tracking-tight text-[#dde4e2]">Popular Vaults</h4>
            <div className="mt-1 h-1 w-16 rounded-full bg-[#62f3e4]" />
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <Coins size={13} className="text-[#62f3e4]" aria-hidden="true" /> Free · win 25 NB
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARCADE_IDS.map((id, i) => (
            <ArcadeCard key={id} id={id} index={i} onOpen={() => void openArcade(id)} />
          ))}
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-ntv-muted sm:text-left">
        Lifetime earned: <span className="font-[family-name:var(--font-mono,monospace)] text-[#ffabef]">{fmt(lifetimeEarned)} NB</span>.
        These are the same challenges guarding the album portals.
      </p>
    </div>
  );
}

export function ArcadePageClient() {
  // useSearchParams requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ArcadePageInner />
    </Suspense>
  );
}
