"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, ResultBanner, StakeControls, TableButton } from "../GameShell";
import { useCasinoRound } from "../useCasinoRound";

/** Nano Slots: 3 weighted reels. Three portals pay 100×. */

type Symbol_ = { icon: string; weight: number; three: number; two: number };

const SYMBOLS: Symbol_[] = [
  { icon: "🌀", weight: 1, three: 100, two: 5 },  // portal
  { icon: "💎", weight: 2, three: 40, two: 3 },
  { icon: "🎵", weight: 4, three: 15, two: 2 },
  { icon: "⚡", weight: 6, three: 8, two: 1 },
  { icon: "🔋", weight: 8, three: 4, two: 0 },
  { icon: "🛰️", weight: 10, three: 2, two: 0 },
];

const draw = (): Symbol_ => {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    r -= s.weight;
    if (r <= 0) return s;
  }
  return SYMBOLS[SYMBOLS.length - 1];
};

export function Slots() {
  const round = useCasinoRound("slots", 5);
  const [reels, setReels] = useState<string[]>(["🌀", "🌀", "🌀"]);
  const [spinning, setSpinning] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearInterval), []);

  const spin = useCallback(async () => {
    if (!(await round.begin())) return;
    setSpinning(true);
    const final = [draw(), draw(), draw()];
    // Animate each reel, stopping left→right.
    [0, 1, 2].forEach((i) => {
      const int = window.setInterval(() => {
        setReels((r) => {
          const next = [...r];
          next[i] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon;
          return next;
        });
      }, 70);
      timers.current.push(int);
      window.setTimeout(() => {
        clearInterval(int);
        setReels((r) => {
          const next = [...r];
          next[i] = final[i].icon;
          return next;
        });
        if (i === 2) {
          setSpinning(false);
          let mult = 0;
          if (final[0].icon === final[1].icon && final[1].icon === final[2].icon) {
            mult = final[0].three;
          } else if (
            final[0].icon === final[1].icon || final[1].icon === final[2].icon ||
            final[0].icon === final[2].icon
          ) {
            const pair =
              final[0].icon === final[1].icon || final[0].icon === final[2].icon
                ? final[0] : final[1];
            mult = pair.two;
          }
          void round.finish(round.stake * mult, { reels: final.map((f) => f.icon), mult });
        }
      }, 700 + i * 450);
    });
  }, [round]);

  return (
    <GameShell title="Nano Slots" tagline="Three portals pay 100× · pairs pay too">
      <div className="flex flex-col items-center gap-5">
        <div className="flex gap-3" aria-live="polite" aria-label={`Reels: ${reels.join(" ")}`}>
          {reels.map((r, i) => (
            <div
              key={i}
              className="flex h-20 w-20 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#090f0e] text-4xl shadow-inner"
            >
              {r}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[10px] text-[#b3b3b3]">
          {SYMBOLS.map((s) => (
            <span key={s.icon}>{s.icon}×3 → {s.three}×</span>
          ))}
        </div>
        {round.phase === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <StakeControls stake={round.stake} setStake={round.setStake} min={1} max={100} />
            <TableButton onClick={spin}>Spin</TableButton>
          </div>
        )}
        {spinning && <p className="text-xs text-[#bbcac6]">Reels spinning…</p>}
        {round.phase === "done" && !spinning && (
          <ResultBanner payout={round.lastPayout} stake={round.stake} onNext={round.reset} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
