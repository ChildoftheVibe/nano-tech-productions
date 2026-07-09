"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { GameShell, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";

/** 3-Card Monte: watch the queen, track her through the shuffle, pick her
 *  card. Sharp eyes beat the 1-in-3 odds — winning pays 2.5×. */

const SWAPS = 7;

export function ThreeCardMonte() {
  const round = useCasinoRound("three-card-monte", 10);
  // positions[slot] = which card (0=queen) currently sits at that table slot.
  const [positions, setPositions] = useState<number[]>([0, 1, 2]);
  const [phase, setPhase] = useState<"idle" | "show" | "shuffle" | "pick" | "reveal">("idle");
  const [picked, setPicked] = useState<number | null>(null);
  const [queenSlot, setQueenSlot] = useState(1);

  const start = useCallback(async () => {
    if (!(await round.begin())) return;
    setPositions([1, 0, 2]); // queen shown center
    setPicked(null);
    setPhase("show");
    window.setTimeout(() => {
      setPhase("shuffle");
      let pos = [1, 0, 2];
      let swaps = 0;
      const doSwap = () => {
        const a = Math.floor(Math.random() * 3);
        let b = Math.floor(Math.random() * 3);
        while (b === a) b = Math.floor(Math.random() * 3);
        pos = [...pos];
        [pos[a], pos[b]] = [pos[b], pos[a]];
        setPositions(pos);
        swaps++;
        if (swaps < SWAPS) window.setTimeout(doSwap, 420);
        else {
          setQueenSlot(pos.indexOf(0));
          setPhase("pick");
        }
      };
      window.setTimeout(doSwap, 500);
    }, 1200);
  }, [round]);

  const pick = useCallback(
    (slot: number) => {
      if (phase !== "pick") return;
      setPicked(slot);
      setPhase("reveal");
      const won = slot === queenSlot;
      void round.finish(won ? Math.floor(round.stake * 2.5) : 0, {
        picked: slot,
        queen: queenSlot,
      });
    },
    [phase, round, queenSlot],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setPicked(null);
    round.reset();
  }, [round]);

  const faceUp = phase === "show" || phase === "reveal";

  return (
    <GameShell title="3-Card Monte" tagline="Follow the queen · sharp eyes pay 2.5×" art={GAME_ART["three-card-monte"]}>
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-24 items-center gap-4">
          {[0, 1, 2].map((slot) => {
            const cardId = positions[slot];
            const isQueen = cardId === 0;
            return (
              <motion.button
                key={cardId}
                layout
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                type="button"
                onClick={() => pick(slot)}
                disabled={phase !== "pick"}
                className={`flex h-20 w-14 items-center justify-center rounded-lg border text-lg font-bold shadow-md transition-shadow ${
                  phase === "pick" ? "cursor-pointer hover:shadow-[0_0_16px_rgba(98,243,228,0.4)]" : ""
                } ${
                  faceUp && isQueen
                    ? "border-[#ffabef] bg-[#f4f1e8] text-[#c0392b]"
                    : faceUp
                      ? "border-black/20 bg-[#f4f1e8] text-[#1a1a1a]"
                      : "border-[#62f3e4]/40 bg-[repeating-linear-gradient(45deg,#12403a,#12403a_4px,#0d2f2b_4px,#0d2f2b_8px)]"
                } ${phase === "reveal" && picked === slot ? "ring-2 ring-[#62f3e4]" : ""}`}
                aria-label={
                  phase === "pick" ? `Pick card ${slot + 1}`
                  : faceUp ? (isQueen ? "Queen of hearts" : "Jack") : "Face-down card"
                }
              >
                {faceUp ? (isQueen ? "Q♥" : "J♠") : ""}
              </motion.button>
            );
          })}
        </div>
        <p className="text-xs text-[#bbcac6]" aria-live="polite">
          {phase === "show" && "Watch the queen…"}
          {phase === "shuffle" && "Track her!"}
          {phase === "pick" && "Where is she?"}
          {phase === "reveal" && (picked === queenSlot ? "Found her!" : "She slipped away.")}
        </p>
        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={5} max={200} />
            <TableButton onClick={start}>Deal</TableButton>
          </div>
        )}
        {round.phase === "done" && phase === "reveal" && (
          <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={reset} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
