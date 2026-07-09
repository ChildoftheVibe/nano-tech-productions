"use client";

import { useCallback, useState } from "react";
import { GameShell, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";
import { cardLabel, isRed, shuffledDeck, type Card } from "../engine/cards";

/** Pokeno: a 5×5 board of cards; the dealer draws 15 from a second deck.
 *  Fully covered lines (rows, columns, diagonals) pay 10× each; a line with
 *  four of five covered pays 1×. */

const DRAWS = 15;

const LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let r = 0; r < 5; r++) lines.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) lines.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);
  return lines;
})();

export function Pokeno() {
  const round = useCasinoRound("pokeno", 10);
  const [board, setBoard] = useState<Card[]>([]);
  const [covered, setCovered] = useState<boolean[]>([]);
  const [drawn, setDrawn] = useState<Card[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [deck, setDeck] = useState<Card[]>([]);

  const start = useCallback(async () => {
    if (!(await round.begin())) return;
    setBoard(shuffledDeck().slice(0, 25));
    setCovered(Array(25).fill(false));
    setDrawn([]);
    setDeck(shuffledDeck());
    setRemaining(DRAWS);
  }, [round]);

  const drawCard = useCallback(() => {
    if (!remaining || !deck.length) return;
    const card = deck[0];
    setDeck((d) => d.slice(1));
    setDrawn((d) => [...d, card]);
    const nextCovered = board.map(
      (b, i) => covered[i] || (b.rank === card.rank && b.suit === card.suit),
    );
    setCovered(nextCovered);
    const left = remaining - 1;
    setRemaining(left);
    if (left === 0) {
      let mult = 0;
      for (const line of LINES) {
        const hits = line.filter((i) => nextCovered[i]).length;
        if (hits === 5) mult += 10;
        else if (hits === 4) mult += 1;
      }
      mult = Math.min(mult, 25);
      void round.finish(round.stake * mult, { mult });
    }
  }, [remaining, deck, board, covered, round]);

  const reset = useCallback(() => {
    setBoard([]);
    setDrawn([]);
    round.reset();
  }, [round]);

  return (
    <GameShell title="Pokeno" tagline="Cover a full line in 15 draws · lines pay 10×" art={GAME_ART["pokeno"]}>
      <div className="flex flex-col items-center gap-4">
        {board.length > 0 && (
          <div className="grid grid-cols-5 gap-1" role="grid" aria-label="Pokeno board">
            {board.map((c, i) => (
              <div
                key={i}
                className={`flex h-11 w-11 items-center justify-center rounded text-[11px] font-bold sm:h-12 sm:w-12 ${
                  covered[i]
                    ? "bg-[#62f3e4] text-[#003733]"
                    : "bg-[#f4f1e8]"
                }`}
                style={!covered[i] ? { color: isRed(c) ? "#c0392b" : "#1a1a1a" } : undefined}
              >
                {cardLabel(c)}
              </div>
            ))}
          </div>
        )}
        {drawn.length > 0 && (
          <p className="text-xs text-[#bbcac6]" aria-live="polite">
            Drawn: <span className="font-bold text-[#dde4e2]">{cardLabel(drawn[drawn.length - 1])}</span>{" "}
            · {remaining} draws left
          </p>
        )}
        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={5} max={100} />
            <TableButton onClick={start}>Deal Board</TableButton>
          </div>
        )}
        {round.phase === "playing" && remaining > 0 && (
          <TableButton onClick={drawCard}>Draw ({remaining})</TableButton>
        )}
        {round.phase === "done" && (
          <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={reset} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
