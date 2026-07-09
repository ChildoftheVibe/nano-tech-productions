"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import { ARCADE_COMPONENTS, randomArcadeId } from "@/components/games/arcade";
import { GAME_ART } from "@/components/games/art";
import { settleGame, startGame } from "@/components/games/gameApi";
import { useGameKeyboardLock } from "@/store/gameFocusStore";
import { ARCADE_PLAY_REWARD, ARCADE_WIN_REWARD } from "@/lib/nanoBucksShared";

type Props = {
  accent: string;
  albumTitle: string;
  /** Called when the gate is finished (game settled or skipped) — the caller
   *  then routes into the album. */
  onDone: () => void;
  reducedMotion: boolean;
};

/**
 * The portal challenge: after the fly-through, a randomly chosen arcade game
 * blocks the doorway. Winning earns Nano Bucks; the reward is settled
 * server-side. A skip link keeps the album reachable for visitors who can't
 * or won't play (accessibility + purchase funnel).
 */
export function PortalGameGate({ accent, albumTitle, onDone, reducedMotion }: Props) {
  const [gameId] = useState(randomArcadeId);
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [reward, setReward] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const doneRef = useRef(false);
  const game = ARCADE_COMPONENTS[gameId];

  // Hold the keyboard so arrow/space keys drive the game, not the music player.
  useGameKeyboardLock(phase === "playing");

  const begin = useCallback(async () => {
    setPhase("playing");
    try {
      const { sessionId } = await startGame(gameId, 0);
      sessionRef.current = sessionId;
    } catch {
      // Wallet API down — the game still plays, just without a reward.
    }
  }, [gameId]);

  const handleFinish = useCallback(
    async (didWin: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setWon(didWin);
      const sessionId = sessionRef.current;
      if (sessionId) {
        try {
          const res = await settleGame(sessionId, { won: didWin });
          setReward(res.payout);
        } catch {
          setReward(null);
        }
      }
      setPhase("result");
    },
    [],
  );

  // Escape always lets the visitor through to the album.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Portal challenge: ${game.name}`}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0.1 : 0.35 }}
    >
      <div
        className="flex max-h-full w-full max-w-md flex-col items-center gap-4 overflow-y-auto rounded-2xl border p-5"
        style={{
          borderColor: `${accent}66`,
          background: "rgba(9,15,14,0.92)",
          boxShadow: `0 0 60px ${accent}33`,
        }}
      >
        <h2
          className="text-center font-[family-name:var(--font-bungee)] text-lg tracking-tight"
          style={{ color: accent }}
        >
          {phase === "result" ? (won ? "Portal Cleared!" : "The Portal Resists") : "Portal Challenge"}
        </h2>

        {phase === "intro" && (
          <>
            <motion.img
              src={GAME_ART[gameId]}
              alt={`${game.name} game art`}
              className="w-full max-w-[300px] rounded-xl border"
              style={{ borderColor: `${accent}55`, boxShadow: `0 0 30px ${accent}33` }}
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }}
              animate={
                reducedMotion
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      scale: 1,
                      boxShadow: [
                        `0 0 18px ${accent}33`,
                        `0 0 34px ${accent}66`,
                        `0 0 18px ${accent}33`,
                      ],
                    }
              }
              transition={
                reducedMotion
                  ? { duration: 0.2 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
            />
            <p className="text-center text-sm text-[#dde4e2]">
              The <span className="font-bold">{albumTitle}</span> portal summons{" "}
              <span className="font-bold" style={{ color: accent }}>{game.name}</span>.
            </p>
            <p className="text-center text-xs text-[#bbcac6]">{game.instructions}</p>
            <p className="flex items-center gap-1.5 text-xs text-[#bbcac6]">
              <Coins size={13} className="text-[#62f3e4]" aria-hidden="true" />
              Win {ARCADE_WIN_REWARD} NB · finish {ARCADE_PLAY_REWARD} NB
            </p>
            <button
              type="button"
              onClick={begin}
              className="min-h-11 min-w-[176px] rounded-lg px-8 py-3 text-xs font-bold tracking-[0.06em] uppercase transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ background: accent, color: "#003733", boxShadow: `0 0 20px ${accent}4d` }}
            >
              Play
            </button>
          </>
        )}

        {phase === "playing" && <game.Component onFinish={handleFinish} />}

        {phase === "result" && (
          <>
            {reward !== null && reward > 0 && (
              <p className="flex items-center gap-1.5 text-sm font-bold text-[#62f3e4]">
                <Coins size={15} aria-hidden="true" /> +{reward} Nano Bucks
              </p>
            )}
            {reward === 0 && (
              <p className="text-xs text-[#bbcac6]">Daily arcade reward cap reached — plays still count for glory.</p>
            )}
            <button
              type="button"
              onClick={onDone}
              autoFocus
              className="min-h-11 min-w-[176px] rounded-lg px-8 py-3 text-xs font-bold tracking-[0.06em] uppercase transition-transform hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ background: accent, color: "#003733", boxShadow: `0 0 20px ${accent}4d` }}
            >
              Enter {albumTitle}
            </button>
          </>
        )}

        {phase !== "result" && (
          <button
            type="button"
            onClick={onDone}
            className="text-[11px] text-[#b3b3b3] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Skip to album
          </button>
        )}
      </div>
    </motion.div>
  );
}
