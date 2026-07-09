"use client";

import { useCallback, useState } from "react";
import { GameShell, PlayingCard, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";
import { cardLabel, evalFive, shuffledDeck, type Card } from "../engine/cards";

/** 9/6 Jacks or Better video poker. Payouts are per-stake multipliers. */
const PAYTABLE: Record<string, number> = {
  "royal-flush": 250,
  "straight-flush": 50,
  quads: 25,
  "full-house": 9,
  flush: 6,
  straight: 4,
  trips: 3,
  "two-pair": 2,
  pair: 1, // jacks or better only — checked below
  "high-card": 0,
};

export function VideoPoker() {
  const round = useCasinoRound("video-poker", 5);
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState<boolean[]>([]);
  const [drawn, setDrawn] = useState(false);
  const [label, setLabel] = useState("");

  const deal = useCallback(async () => {
    if (!(await round.begin())) return;
    const d = shuffledDeck();
    setHand(d.slice(0, 5));
    setDeck(d.slice(5));
    setHeld([false, false, false, false, false]);
    setDrawn(false);
    setLabel("");
  }, [round]);

  const draw = useCallback(() => {
    let rest = [...deck];
    const finalHand = hand.map((c, i) => {
      if (held[i]) return c;
      const nc = rest[0];
      rest = rest.slice(1);
      return nc;
    });
    setHand(finalHand);
    setDrawn(true);
    const ev = evalFive(finalHand);
    let mult = PAYTABLE[ev.rank] ?? 0;
    if (ev.rank === "pair") {
      // Jacks or better: the paired rank must be J/Q/K/A.
      const counts = new Map<number, number>();
      finalHand.forEach((c) => counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1));
      const pairRank = [...counts.entries()].find(([, n]) => n === 2)?.[0] ?? 0;
      if (pairRank < 11) mult = 0;
    }
    setLabel(mult > 0 ? ev.label : "No win");
    void round.finish(round.stake * mult, { hand: ev.rank, mult });
  }, [deck, hand, held, round]);

  const playing = round.phase === "playing" && !drawn;

  return (
    <GameShell title="Video Poker" tagline="9/6 Jacks or Better · royal pays 250×" art={GAME_ART["video-poker"]}>
      <div className="flex flex-col items-center gap-5">
        {hand.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              {hand.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!playing}
                  onClick={() =>
                    setHeld((h) => h.map((v, j) => (j === i ? !v : v)))
                  }
                  className={`flex flex-col items-center gap-1 rounded-lg p-1 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:cursor-default ${
                    held[i] && playing ? "-translate-y-2" : ""
                  }`}
                  aria-pressed={held[i]}
                  aria-label={`${cardLabel(c)}. ${held[i] ? "Held, tap to release" : "Tap to hold"}`}
                >
                  <PlayingCard card={c} />
                  <span
                    className={`text-[10px] font-bold tracking-wide uppercase ${
                      held[i] ? "text-[#62f3e4]" : "text-[#b3b3b3]"
                    }`}
                  >
                    {playing ? (held[i] ? "Held" : "Hold") : ""}
                  </span>
                </button>
              ))}
            </div>
            {label && <p className="text-sm font-bold text-[#dde4e2]" aria-live="polite">{label}</p>}
          </div>
        )}

        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={1} max={100} />
            <TableButton onClick={deal}>Deal</TableButton>
          </div>
        )}
        {playing && <TableButton onClick={draw}>Draw</TableButton>}
        {round.phase === "done" && (
          <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={round.reset} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
