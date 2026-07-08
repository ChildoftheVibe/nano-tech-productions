"use client";

import { useCallback, useState } from "react";
import { GameShell, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { useCasinoRound } from "../useCasinoRound";

/** European roulette (single zero). One bet per spin. */

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

type Bet =
  | { kind: "red" | "black" | "odd" | "even" | "low" | "high" }
  | { kind: "dozen"; dozen: 0 | 1 | 2 }
  | { kind: "straight"; n: number };

const betWins = (bet: Bet, n: number): number => {
  if (n === 0) return bet.kind === "straight" && bet.n === 0 ? 36 : 0;
  switch (bet.kind) {
    case "red": return REDS.has(n) ? 2 : 0;
    case "black": return REDS.has(n) ? 0 : 2;
    case "odd": return n % 2 === 1 ? 2 : 0;
    case "even": return n % 2 === 0 ? 2 : 0;
    case "low": return n <= 18 ? 2 : 0;
    case "high": return n >= 19 ? 2 : 0;
    case "dozen": return Math.floor((n - 1) / 12) === bet.dozen ? 3 : 0;
    case "straight": return bet.n === n ? 36 : 0;
  }
};

const betLabel = (bet: Bet): string =>
  bet.kind === "dozen" ? `${bet.dozen * 12 + 1}–${bet.dozen * 12 + 12}`
  : bet.kind === "straight" ? `#${bet.n}`
  : bet.kind === "low" ? "1–18"
  : bet.kind === "high" ? "19–36"
  : bet.kind;

export function Roulette() {
  const round = useCasinoRound("roulette", 10);
  const [bet, setBet] = useState<Bet>({ kind: "red" });
  const [result, setResult] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);

  const spin = useCallback(async () => {
    if (!(await round.begin())) return;
    setSpinning(true);
    setResult(null);
    const n = Math.floor(Math.random() * 37);
    // Tick through numbers for suspense, then land.
    let ticks = 0;
    const tick = () => {
      ticks++;
      setResult(Math.floor(Math.random() * 37));
      if (ticks < 18) window.setTimeout(tick, 40 + ticks * 14);
      else {
        setResult(n);
        setSpinning(false);
        void round.finish(round.stake * betWins(bet, n), { n, bet: betLabel(bet) });
      }
    };
    tick();
  }, [round, bet]);

  const chip = (b: Bet, label: string) => {
    const active = betLabel(bet) === betLabel(b);
    return (
      <button
        key={label}
        type="button"
        disabled={round.phase !== "idle"}
        onClick={() => setBet(b)}
        className={`min-h-9 rounded-lg border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase transition-colors ${
          active
            ? "border-[#62f3e4] bg-[#62f3e4]/15 text-[#62f3e4]"
            : "border-[rgba(255,255,255,0.12)] text-[#dde4e2] hover:border-[#62f3e4]/60"
        }`}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  };

  const color = result === null ? "#bbcac6" : result === 0 ? "#7dd87d" : REDS.has(result) ? "#ff8a8a" : "#dde4e2";

  return (
    <GameShell title="Roulette" tagline="European wheel · straight-up pays 35:1">
      <div className="flex flex-col items-center gap-5">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full border-4 font-[family-name:var(--font-bungee)] text-3xl"
          style={{ borderColor: `${color}66`, color, boxShadow: `0 0 30px ${color}33` }}
          aria-live="polite"
          aria-label={result === null ? "Wheel idle" : `Ball on ${result}`}
        >
          {result ?? "—"}
        </div>

        <div className="flex max-w-sm flex-wrap justify-center gap-2">
          {chip({ kind: "red" }, "Red")}
          {chip({ kind: "black" }, "Black")}
          {chip({ kind: "odd" }, "Odd")}
          {chip({ kind: "even" }, "Even")}
          {chip({ kind: "low" }, "1–18")}
          {chip({ kind: "high" }, "19–36")}
          {chip({ kind: "dozen", dozen: 0 }, "1st 12")}
          {chip({ kind: "dozen", dozen: 1 }, "2nd 12")}
          {chip({ kind: "dozen", dozen: 2 }, "3rd 12")}
        </div>
        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] text-[#bbcac6]">
              Lucky number
              <input
                type="number"
                min={0}
                max={36}
                className="w-16 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] px-2 py-1.5 text-center text-sm text-[#dde4e2]"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n >= 0 && n <= 36) setBet({ kind: "straight", n });
                }}
                value={bet.kind === "straight" ? bet.n : ""}
                placeholder="—"
              />
            </label>
            <StakeControls stake={round.stake} setStake={round.setStake} min={1} max={250} />
            <TableButton onClick={spin}>Spin · {betLabel(bet)}</TableButton>
          </div>
        )}
        {spinning && <p className="text-xs text-[#bbcac6]">No more bets…</p>}
        {round.phase === "done" && !spinning && (
          <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={round.reset} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
