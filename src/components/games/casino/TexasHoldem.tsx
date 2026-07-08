"use client";

import { useCallback, useState } from "react";
import { GameShell, PlayingCard, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { useCasinoRound } from "../useCasinoRound";
import { evalBest, shuffledDeck, type Card } from "../engine/cards";

/** Heads-up hold'em vs the house: ante to see your hole cards, call (1× ante)
 *  to run out the board, best five-card hand wins 2× the total wagered.
 *  Folding forfeits the ante. */
export function TexasHoldem() {
  const round = useCasinoRound("holdem", 10);
  const [hole, setHole] = useState<Card[]>([]);
  const [house, setHouse] = useState<Card[]>([]);
  const [board, setBoard] = useState<Card[]>([]);
  const [showdown, setShowdown] = useState(false);
  const [labels, setLabels] = useState<{ mine: string; house: string } | null>(null);
  const [called, setCalled] = useState(false);

  const deal = useCallback(async () => {
    if (!(await round.begin())) return;
    const d = shuffledDeck();
    setHole([d[0], d[1]]);
    setHouse([d[2], d[3]]);
    setBoard(d.slice(4, 9));
    setShowdown(false);
    setLabels(null);
    setCalled(false);
  }, [round]);

  const fold = useCallback(() => {
    setShowdown(true);
    void round.finish(0, { folded: true });
  }, [round]);

  const call = useCallback(async () => {
    if (!(await round.raise(round.stake))) return;
    setCalled(true);
    setShowdown(true);
    const mine = evalBest([...hole, ...board]);
    const theirs = evalBest([...house, ...board]);
    setLabels({ mine: mine.label, house: theirs.label });
    const total = round.stake * 2;
    const payout =
      mine.score > theirs.score ? total * 2
      : mine.score === theirs.score ? total
      : 0;
    void round.finish(payout, { mine: mine.rank, house: theirs.rank });
  }, [round, hole, house, board]);

  const playing = round.phase === "playing" && !showdown;

  return (
    <GameShell title="Texas Hold'em" tagline="Heads-up vs the house · call to see the board">
      <div className="flex flex-col items-center gap-4">
        {house.length > 0 && (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">
              House {labels ? `· ${labels.house}` : ""}
            </p>
            <div className="flex gap-2">
              {house.map((c, i) => (
                <PlayingCard key={i} card={c} hidden={!showdown || !called} small />
              ))}
            </div>
          </div>
        )}
        {board.length > 0 && (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">Board</p>
            <div className="flex gap-1.5">
              {board.map((c, i) => (
                <PlayingCard key={i} card={c} hidden={!showdown || !called} small />
              ))}
            </div>
          </div>
        )}
        {hole.length > 0 && (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] tracking-wide text-[#bbcac6] uppercase">
              You {labels ? `· ${labels.mine}` : ""}
            </p>
            <div className="flex gap-2">
              {hole.map((c, i) => (
                <PlayingCard key={i} card={c} />
              ))}
            </div>
          </div>
        )}

        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={5} max={250} />
            <TableButton onClick={deal}>Ante &amp; Deal</TableButton>
          </div>
        )}
        {playing && (
          <div className="flex gap-2">
            <TableButton onClick={call}>Call {round.stake} NB</TableButton>
            <TableButton onClick={fold} variant="outline">Fold</TableButton>
          </div>
        )}
        {round.phase === "done" && (
          <ResultBanner
            payout={round.lastPayout}
            stake={round.stake * (called ? 2 : 1)}
            onNext={round.reset}
          />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
