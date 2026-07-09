"use client";

import { useCallback, useState } from "react";
import { GameShell, PlayingCard, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";
import { shuffledDeck, type Card } from "../engine/cards";

/** One-on-one card flip: high card wins even money, tie pushes. */
export function CardFlip() {
  const round = useCasinoRound("card-flip", 10);
  const [mine, setMine] = useState<Card | null>(null);
  const [house, setHouse] = useState<Card | null>(null);

  const flip = useCallback(async () => {
    if (!(await round.begin())) return;
    const d = shuffledDeck();
    setMine(d[0]);
    setHouse(d[1]);
    window.setTimeout(() => {
      const payout =
        d[0].rank > d[1].rank ? round.stake * 2
        : d[0].rank === d[1].rank ? round.stake
        : 0;
      void round.finish(payout, { mine: d[0].rank, house: d[1].rank });
    }, 700);
  }, [round]);

  const reset = useCallback(() => {
    setMine(null);
    setHouse(null);
    round.reset();
  }, [round]);

  return (
    <GameShell title="Card Flip Duel" tagline="High card wins · tie pushes" art={GAME_ART["card-flip"]}>
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">You</p>
            <PlayingCard card={mine ?? undefined} hidden={!mine} />
          </div>
          <span className="font-[family-name:var(--font-bungee)] text-lg text-[#ffabef]">VS</span>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">House</p>
            <PlayingCard card={house ?? undefined} hidden={!house} />
          </div>
        </div>
        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={1} max={500} />
            <TableButton onClick={flip}>Flip</TableButton>
          </div>
        )}
        {round.phase === "done" && (
          <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={reset} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
