"use client";

import { useCallback, useState } from "react";
import { GameShell, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";

/** Craps, pass-line only: 7/11 wins the come-out, 2/3/12 craps out, anything
 *  else sets the point, hit it before a 7 to win even money. */

const DIE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function Craps() {
  const round = useCasinoRound("craps", 10);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [point, setPoint] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const rollDice = (): [number, number] => [
    1 + Math.floor(Math.random() * 6),
    1 + Math.floor(Math.random() * 6),
  ];

  const comeOut = useCallback(async () => {
    if (!(await round.begin())) return;
    setPoint(null);
    setLog([]);
    setDice(null);
  }, [round]);

  const roll = useCallback(() => {
    const d = rollDice();
    const sum = d[0] + d[1];
    setDice(d);
    if (point === null) {
      if (sum === 7 || sum === 11) {
        setLog((l) => [...l, `Come-out ${sum}, natural!`]);
        void round.finish(round.stake * 2, { comeOut: sum });
      } else if (sum === 2 || sum === 3 || sum === 12) {
        setLog((l) => [...l, `Come-out ${sum}, craps.`]);
        void round.finish(0, { comeOut: sum });
      } else {
        setPoint(sum);
        setLog((l) => [...l, `Point is ${sum}.`]);
      }
    } else {
      if (sum === point) {
        setLog((l) => [...l, `Rolled ${sum}, point hit!`]);
        void round.finish(round.stake * 2, { point, hit: true });
      } else if (sum === 7) {
        setLog((l) => [...l, `Rolled 7, seven out.`]);
        void round.finish(0, { point, sevenOut: true });
      } else {
        setLog((l) => [...l, `Rolled ${sum}, roll again.`]);
      }
    }
  }, [point, round]);

  const reset = useCallback(() => {
    setDice(null);
    setPoint(null);
    setLog([]);
    round.reset();
  }, [round]);

  return (
    <GameShell title="Craps" tagline="Pass line · point pays even money" art={GAME_ART["craps"]}>
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center gap-4" aria-live="polite">
          {(dice ?? [0, 0]).map((d, i) => (
            <span key={i} className="text-6xl text-[#dde4e2]" aria-label={d ? `Die showing ${d}` : "Die"}>
              {d ? DIE[d] : "🎲"}
            </span>
          ))}
        </div>
        {point !== null && (
          <p className="rounded-full border border-[#ffabef]/50 px-4 py-1 text-xs font-bold tracking-wide text-[#ffabef] uppercase">
            Point: {point}
          </p>
        )}
        <ul className="flex max-h-24 w-full max-w-xs flex-col-reverse gap-0.5 overflow-y-auto text-center text-[11px] text-[#bbcac6]">
          {log.slice(-6).map((line, i) => <li key={i}>{line}</li>)}
        </ul>

        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={5} max={250} />
            <TableButton onClick={comeOut}>Place Pass-Line Bet</TableButton>
          </div>
        )}
        {round.phase === "playing" && <TableButton onClick={roll}>Roll</TableButton>}
        {round.phase === "done" && (
          <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={reset} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
