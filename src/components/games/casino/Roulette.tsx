"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Trash2 } from "lucide-react";
import { GameShell, ResultBanner, TableButton } from "../GameShell";
import { GAME_ART } from "../art";
import { useCasinoRound } from "../useCasinoRound";

/**
 * European roulette (single zero), casino-floor edition: a spinning wheel with
 * ball animation plus the full betting table (straight-up numbers, dozens,
 * columns, and the even-money outside bets) with chip placement, undo/clear,
 * and covered-number highlighting. Total table stake is one server round.
 */

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/** Physical pocket order on a European wheel, clockwise from zero. */
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const SEG = 360 / 37;

const MAX_TABLE_BET = 250;
const SPIN_MS = 4200;
const CHIP_VALUES = [1, 5, 25, 100] as const;
const CHIP_STYLE: Record<number, string> = {
  1: "radial-gradient(circle at 35% 30%, #7ffcef, #0e7c70)",
  5: "radial-gradient(circle at 35% 30%, #ffc6f4, #b0489a)",
  25: "radial-gradient(circle at 35% 30%, #ffe3a0, #a97b1e)",
  100: "radial-gradient(circle at 35% 30%, #cdbcff, #5b3fa8)",
};

type Spot =
  | { kind: "straight"; n: number }
  | { kind: "red" } | { kind: "black" }
  | { kind: "odd" } | { kind: "even" }
  | { kind: "low" } | { kind: "high" }
  | { kind: "dozen"; d: 0 | 1 | 2 }
  | { kind: "column"; c: 1 | 2 | 3 };

const spotKey = (s: Spot): string =>
  s.kind === "straight" ? `n${s.n}`
  : s.kind === "dozen" ? `d${s.d}`
  : s.kind === "column" ? `c${s.c}`
  : s.kind;

const spotName = (s: Spot): string =>
  s.kind === "straight" ? (s.n === 0 ? "zero" : `number ${s.n}`)
  : s.kind === "dozen" ? `${s.d * 12 + 1} to ${s.d * 12 + 12}`
  : s.kind === "column" ? `column ${s.c}, pays 2 to 1`
  : s.kind === "low" ? "1 to 18"
  : s.kind === "high" ? "19 to 36"
  : s.kind;

/** Total return (stake included) per unit staked when the spot wins. */
const spotReturn = (s: Spot): number =>
  s.kind === "straight" ? 36 : s.kind === "dozen" || s.kind === "column" ? 3 : 2;

const spotWins = (s: Spot, n: number): boolean => {
  if (s.kind === "straight") return s.n === n;
  if (n === 0) return false;
  switch (s.kind) {
    case "red": return REDS.has(n);
    case "black": return !REDS.has(n);
    case "odd": return n % 2 === 1;
    case "even": return n % 2 === 0;
    case "low": return n <= 18;
    case "high": return n >= 19;
    case "dozen": return Math.floor((n - 1) / 12) === s.d;
    case "column": return n % 3 === s.c % 3;
  }
};

/** Numbers highlighted while hovering/focusing an outside bet. */
const coveredBy = (s: Spot): Set<number> => {
  const out = new Set<number>();
  for (let n = 0; n <= 36; n++) if (spotWins(s, n)) out.add(n);
  return out;
};

// Static wheel geometry (module scope: built once, deterministic).
const WHEEL_SEGMENTS = WHEEL_ORDER.map((n, i) => {
  // Segment i is centred at the top (12 o'clock) when the wheel rotation is
  // -i * SEG. SVG paths are drawn with segment 0 centred at angle -90°.
  const a0 = ((i * SEG - SEG / 2 - 90) * Math.PI) / 180;
  const a1 = ((i * SEG + SEG / 2 - 90) * Math.PI) / 180;
  const mid = ((i * SEG - 90) * Math.PI) / 180;
  const R = 100;
  const path = `M0 0 L${(Math.cos(a0) * R).toFixed(2)} ${(Math.sin(a0) * R).toFixed(2)} A${R} ${R} 0 0 1 ${(Math.cos(a1) * R).toFixed(2)} ${(Math.sin(a1) * R).toFixed(2)} Z`;
  const fill = n === 0 ? "#0e7c70" : REDS.has(n) ? "#b33648" : "#1c2422";
  return {
    n,
    path,
    fill,
    tx: Math.cos(mid) * 82,
    ty: Math.sin(mid) * 82,
    rot: i * SEG,
  };
});

// Betting-table rows: top row is the "3" column, bottom row is the "1" column.
const TABLE_ROWS: number[][] = [
  Array.from({ length: 12 }, (_, i) => i * 3 + 3),
  Array.from({ length: 12 }, (_, i) => i * 3 + 2),
  Array.from({ length: 12 }, (_, i) => i * 3 + 1),
];

export function Roulette() {
  const round = useCasinoRound("roulette", 0);
  const reduce = useReducedMotion();

  const [bets, setBets] = useState<Map<string, { spot: Spot; amount: number }>>(new Map());
  const [placeOrder, setPlaceOrder] = useState<string[]>([]);
  const [chip, setChip] = useState<number>(5);
  const [hovered, setHovered] = useState<Spot | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelRot, setWheelRot] = useState(0);
  const [spinId, setSpinId] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [announce, setAnnounce] = useState("");
  const pendingRef = useRef<number | null>(null);
  const settledRef = useRef(false);

  const total = useMemo(
    () => [...bets.values()].reduce((s, b) => s + b.amount, 0),
    [bets],
  );

  // The server round's stake always mirrors the table total.
  useEffect(() => {
    round.setStake(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setStake is stable
  }, [total]);

  const covered = useMemo(() => (hovered ? coveredBy(hovered) : null), [hovered]);

  const idle = round.phase === "idle" && !spinning;

  const placeBet = useCallback(
    (spot: Spot) => {
      if (!idle) return;
      const key = spotKey(spot);
      setBets((prev) => {
        const cur = prev.get(key)?.amount ?? 0;
        const room = MAX_TABLE_BET - [...prev.values()].reduce((s, b) => s + b.amount, 0);
        const add = Math.min(chip, room);
        if (add <= 0) return prev;
        const next = new Map(prev);
        next.set(key, { spot, amount: cur + add });
        return next;
      });
      setPlaceOrder((o) => [...o, key]);
      setAnnounce(`${chip} on ${spotName(spot)}`);
    },
    [chip, idle],
  );

  const undo = useCallback(() => {
    if (!idle || !placeOrder.length) return;
    const key = placeOrder[placeOrder.length - 1];
    setPlaceOrder((o) => o.slice(0, -1));
    setBets((prev) => {
      const cur = prev.get(key);
      if (!cur) return prev;
      const next = new Map(prev);
      const rem = cur.amount - chip;
      if (rem > 0) next.set(key, { ...cur, amount: rem });
      else next.delete(key);
      return next;
    });
  }, [idle, placeOrder, chip]);

  const clear = useCallback(() => {
    if (!idle) return;
    setBets(new Map());
    setPlaceOrder([]);
  }, [idle]);

  const settle = useCallback(async () => {
    if (settledRef.current) return;
    settledRef.current = true;
    const n = pendingRef.current;
    if (n === null) return;
    const payout = [...bets.values()].reduce(
      (sum, b) => sum + (spotWins(b.spot, n) ? b.amount * spotReturn(b.spot) : 0),
      0,
    );
    setSpinning(false);
    setResult(n);
    setHistory((h) => [n, ...h].slice(0, 10));
    setAnnounce(
      `Ball landed on ${n}${n === 0 ? "" : REDS.has(n) ? ", red" : ", black"}. ${
        payout > 0 ? `You collect ${payout} NB.` : "No winning bets."
      }`,
    );
    await round.finish(payout, { n, bets: [...bets.keys()] });
  }, [bets, round]);

  const spin = useCallback(async () => {
    if (!idle || total < 1) return;
    if (!(await round.begin())) return;
    const n = Math.floor(Math.random() * 37);
    pendingRef.current = n;
    settledRef.current = false;
    setResult(null);
    setAnnounce("No more bets. The wheel is spinning.");

    if (reduce) {
      // Reduced motion: land instantly, no spin theatre.
      const idx = WHEEL_ORDER.indexOf(n);
      setWheelRot((r) => r - (((r % 360) + 360) % 360) - idx * SEG);
      void settle();
      return;
    }

    setSpinning(true);
    setSpinId((s) => s + 1);
    const idx = WHEEL_ORDER.indexOf(n);
    setWheelRot((r) => {
      const current = ((r % 360) + 360) % 360;
      const target = ((-idx * SEG) % 360 + 360) % 360;
      const delta = (target - current + 360) % 360;
      return r + 4 * 360 + delta;
    });
  }, [idle, total, round, reduce, settle]);

  const again = useCallback(() => {
    // Keep the table bets so the player can re-spin the same board.
    round.reset();
  }, [round]);

  const chipOn = (spot: Spot) => bets.get(spotKey(spot))?.amount ?? 0;

  /** Shared cell renderer for the betting table. */
  const cell = (
    spot: Spot,
    label: string,
    className: string,
    styleOverride?: React.CSSProperties,
  ) => {
    const amount = chipOn(spot);
    const isCovered =
      covered !== null && spot.kind === "straight" && covered.has(spot.n);
    const won = result !== null && !spinning && spotWins(spot, result) && amount > 0;
    return (
      <button
        key={spotKey(spot)}
        type="button"
        onClick={() => placeBet(spot)}
        onMouseEnter={() => spot.kind !== "straight" && setHovered(spot)}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => spot.kind !== "straight" && setHovered(spot)}
        onBlur={() => setHovered(null)}
        disabled={!idle}
        aria-label={`Bet ${chip} on ${spotName(spot)}${amount ? `, ${amount} placed` : ""}`}
        className={`relative flex min-h-11 items-center justify-center border border-[#0d1a17] text-[11px] font-bold transition-shadow focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] disabled:cursor-default ${
          isCovered ? "ring-2 ring-inset ring-[#62f3e4]/80" : ""
        } ${won ? "ring-2 ring-inset ring-[#f0c674]" : ""} ${className}`}
        style={styleOverride}
      >
        {label}
        {amount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[9px] font-bold text-[#0d1a17] shadow-md"
            style={{
              background: CHIP_STYLE[CHIP_VALUES.find((v) => amount <= v) ?? 100] ?? CHIP_STYLE[100],
              boxShadow: "0 2px 6px rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,.35)",
            }}
          >
            {amount}
          </span>
        )}
      </button>
    );
  };

  const numColor = (n: number) =>
    n === 0 ? "bg-[#0e7c70] text-[#eafffb]" : REDS.has(n) ? "bg-[#b33648] text-[#fdf3f4]" : "bg-[#1c2422] text-[#e8ecea]";

  return (
    <GameShell title="Roulette" tagline="European wheel · straight-up pays 35:1" art={GAME_ART["roulette"]}>
      <div className="flex flex-col items-center gap-5">
        {/* ───────────────────────── Wheel ───────────────────────── */}
        <div className="relative h-60 w-60 sm:h-64 sm:w-64" role="img" aria-label={
          result === null ? "Roulette wheel" : `Roulette wheel showing ${result}`
        }>
          {/* Pointer */}
          <div
            aria-hidden="true"
            className="absolute -top-1 left-1/2 z-20 -translate-x-1/2"
            style={{
              width: 0, height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderTop: "14px solid #ffabef",
              filter: "drop-shadow(0 0 6px rgba(255,171,239,.8))",
            }}
          />
          {/* Rotating wheel */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: wheelRot }}
            initial={false}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: SPIN_MS / 1000, ease: [0.12, 0.8, 0.15, 1] }
            }
            onAnimationComplete={() => {
              if (pendingRef.current !== null && !settledRef.current && spinning) void settle();
            }}
          >
            <svg viewBox="-110 -110 220 220" className="h-full w-full" aria-hidden="true">
              <circle r="108" fill="#141a18" stroke="#f0c674" stroke-width="3" />
              {WHEEL_SEGMENTS.map((s) => (
                <path key={s.n} d={s.path} fill={s.fill} stroke="#f0c674" strokeWidth="0.6" />
              ))}
              {WHEEL_SEGMENTS.map((s) => (
                <text
                  key={`t${s.n}`}
                  x={s.tx}
                  y={s.ty}
                  fill="#f4f1e8"
                  fontSize="8.5"
                  fontFamily="var(--font-bungee), sans-serif"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${s.rot} ${s.tx} ${s.ty})`}
                >
                  {s.n}
                </text>
              ))}
              <circle r="58" fill="#0d1a17" stroke="#f0c674" strokeWidth="2.5" />
              <circle r="8" fill="#f0c674" />
            </svg>
          </motion.div>
          {/* Ball: orbits counter-clockwise and settles at the pointer, where
              the winning pocket arrives. */}
          {(spinning || result !== null) && (
            <motion.div
              key={spinId}
              className="pointer-events-none absolute inset-0 z-10"
              initial={false}
              animate={{ rotate: spinning && !reduce ? [-1080, 0] : 0 }}
              transition={
                spinning && !reduce
                  ? { duration: SPIN_MS / 1000, ease: [0.1, 0.7, 0.2, 1] }
                  : { duration: 0 }
              }
              aria-hidden="true"
            >
              <span
                className="absolute left-1/2 top-[9%] h-3.5 w-3.5 -translate-x-1/2 rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 30%, #ffffff, #cfc9ba)",
                  boxShadow: "0 2px 5px rgba(0,0,0,.6)",
                }}
              />
            </motion.div>
          )}
          {/* Hub result readout */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full font-[family-name:var(--font-bungee)] text-2xl ${
                result === null
                  ? "text-[#8fb8b1]"
                  : result === 0
                    ? "text-[#62f3e4]"
                    : REDS.has(result)
                      ? "text-[#ff8a8a]"
                      : "text-[#dde4e2]"
              }`}
            >
              {spinning ? "" : result ?? ""}
            </span>
          </div>
        </div>

        {/* Live announcements for screen readers */}
        <p aria-live="polite" className="sr-only">{announce}</p>

        {/* Recent results */}
        {history.length > 0 && (
          <div className="flex items-center gap-1.5" aria-label={`Recent results: ${history.join(", ")}`}>
            {history.map((n, i) => (
              <span
                key={`${i}-${n}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${numColor(n)} ${i === 0 ? "ring-2 ring-[#f0c674]" : "opacity-70"}`}
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {/* ─────────────────────── Betting table ─────────────────────── */}
        <div className="w-full overflow-x-auto pb-1">
          <div className="mx-auto w-fit rounded-xl border border-[#f0c674]/40 bg-[#0e3b34] p-2 shadow-[inset_0_0_30px_rgba(0,0,0,.45)]">
            <div className="flex">
              {/* Zero spans the three number rows */}
              {cell(
                { kind: "straight", n: 0 },
                "0",
                "w-11 rounded-l-lg bg-[#0e7c70] text-[#eafffb]",
                { minHeight: "8.25rem" },
              )}
              <div>
                {/* 12 × 3 number grid + column bets */}
                {TABLE_ROWS.map((row, r) => (
                  <div key={r} className="flex">
                    {row.map((n) =>
                      cell({ kind: "straight", n }, String(n), `w-11 ${numColor(n)}`),
                    )}
                    {cell(
                      { kind: "column", c: (3 - r) as 1 | 2 | 3 },
                      "2:1",
                      "w-11 bg-[#12403a] text-[#bbcac6]",
                    )}
                  </div>
                ))}
                {/* Dozens */}
                <div className="flex">
                  {([0, 1, 2] as const).map((d) =>
                    cell(
                      { kind: "dozen", d },
                      `${d * 12 + 1}-${d * 12 + 12}`,
                      "w-[8.25rem] bg-[#12403a] text-[#dde4e2]",
                    ),
                  )}
                  <div className="w-11" aria-hidden="true" />
                </div>
                {/* Even-money outside bets */}
                <div className="flex">
                  {cell({ kind: "low" }, "1-18", "w-[4.125rem] bg-[#12403a] text-[#dde4e2]")}
                  {cell({ kind: "even" }, "EVEN", "w-[4.125rem] bg-[#12403a] text-[#dde4e2]")}
                  {cell({ kind: "red" }, "RED", "w-[4.125rem] bg-[#b33648] text-[#fdf3f4]")}
                  {cell({ kind: "black" }, "BLACK", "w-[4.125rem] bg-[#1c2422] text-[#e8ecea]")}
                  {cell({ kind: "odd" }, "ODD", "w-[4.125rem] bg-[#12403a] text-[#dde4e2]")}
                  {cell({ kind: "high" }, "19-36", "w-[4.125rem] bg-[#12403a] text-[#dde4e2]")}
                  <div className="w-11" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────── Bet controls ─────────────────────── */}
        <div className="flex w-full max-w-xl flex-col items-center gap-3">
          <div className="flex items-center gap-2" role="group" aria-label="Chip value">
            {CHIP_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setChip(v)}
                disabled={!idle}
                aria-pressed={chip === v}
                aria-label={`Select ${v} Nano Buck chip`}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold text-[#0d1a17] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:opacity-40 ${
                  chip === v ? "scale-110 ring-2 ring-[#62f3e4]" : "opacity-80 hover:opacity-100"
                }`}
                style={{
                  background: CHIP_STYLE[v],
                  boxShadow: "0 3px 8px rgba(0,0,0,.5), inset 0 0 0 3px rgba(255,255,255,.3)",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              className="min-w-24 rounded-lg bg-[#242b2a] px-3 py-2.5 text-center text-sm font-bold tabular-nums text-[#62f3e4]"
              aria-live="polite"
            >
              Total {total} NB
            </span>
            <button
              type="button"
              onClick={undo}
              disabled={!idle || placeOrder.length === 0}
              aria-label="Undo last chip"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] text-[#dde4e2] transition-colors hover:border-[#62f3e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:opacity-40"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={!idle || total === 0}
              aria-label="Clear all bets"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] text-[#dde4e2] transition-colors hover:border-[#ff8a8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:opacity-40"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
            {idle && (
              <TableButton onClick={() => void spin()} disabled={total < 1}>
                Spin · {total} NB
              </TableButton>
            )}
          </div>
          {spinning && <p className="text-xs text-[#bbcac6]">No more bets…</p>}
        </div>

        {round.phase === "done" && !spinning && (
          <ResultBanner payout={round.lastPayout} stake={total} onNext={again} />
        )}
        {round.error && <p className="text-xs text-[#ff8a8a]">{round.error.replace(/_/g, " ")}</p>}
      </div>
    </GameShell>
  );
}
