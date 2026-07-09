"use client";

import { useCallback, useMemo, useState } from "react";
import { Bomb, Flag } from "lucide-react";

export type ArcadeProps = { onFinish: (won: boolean) => void };

// Tuned for a high win rate: a 7×7 board with 6 mines (~12% density on a small
// grid means far fewer 50/50 guesses than the classic 9×9) plus a guaranteed
// safe, zero-adjacent first click via flood-fill below.
const SIZE = 7;
const MINES = 6;

type Cell = { mine: boolean; adj: number; open: boolean; flag: boolean };

function buildBoard(safeIdx: number): Cell[] {
  const cells: Cell[] = Array.from({ length: SIZE * SIZE }, () => ({
    mine: false, adj: 0, open: false, flag: false,
  }));
  // Keep the first click AND its neighbours mine-free so the opening click
  // always flood-fills a zero region — no first-move deaths, no blind guess.
  const safeZone = new Set([safeIdx, ...neighbors(safeIdx)]);
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * cells.length);
    if (safeZone.has(i) || cells[i].mine) continue;
    cells[i].mine = true;
    placed++;
  }
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].mine) continue;
    cells[i].adj = neighbors(i).filter((n) => cells[n].mine).length;
  }
  return cells;
}

function neighbors(i: number): number[] {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push(nr * SIZE + nc);
    }
  }
  return out;
}

const NUM_COLORS = ["", "#62f3e4", "#7dd87d", "#ffabef", "#f0c674", "#ff8a8a", "#8abeb7", "#dde4e2", "#b3b3b3"];

export function Minesweeper({ onFinish }: ArcadeProps) {
  const [cells, setCells] = useState<Cell[] | null>(null);
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const [flagMode, setFlagMode] = useState(false);

  const flagsLeft = useMemo(
    () => MINES - (cells?.filter((c) => c.flag).length ?? 0),
    [cells],
  );

  const end = useCallback(
    (won: boolean) => {
      setStatus(won ? "won" : "lost");
      onFinish(won);
    },
    [onFinish],
  );

  const tap = (i: number) => {
    if (status !== "live") return;
    let board = cells;
    if (!board) {
      board = buildBoard(i);
      setCells(board);
    }
    const next = board.map((c) => ({ ...c }));
    const cell = next[i];
    if (flagMode) {
      if (!cell.open) cell.flag = !cell.flag;
      setCells(next);
      return;
    }
    if (cell.flag || cell.open) return;
    if (cell.mine) {
      next.forEach((c) => { if (c.mine) c.open = true; });
      setCells(next);
      end(false);
      return;
    }
    // Flood-fill open.
    const stack = [i];
    while (stack.length) {
      const j = stack.pop()!;
      const cj = next[j];
      if (cj.open || cj.mine) continue;
      cj.open = true;
      cj.flag = false;
      if (cj.adj === 0) stack.push(...neighbors(j).filter((n) => !next[n].open));
    }
    setCells(next);
    if (next.every((c) => c.open || c.mine)) end(true);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-xs text-[#bbcac6]">
        <span className="flex items-center gap-1">
          <Flag size={13} aria-hidden="true" /> {flagsLeft} left
        </span>
        <button
          type="button"
          onClick={() => setFlagMode((f) => !f)}
          aria-pressed={flagMode}
          aria-label={flagMode ? "Flag mode on. Tap to switch to digging." : "Dig mode on. Tap to switch to flagging."}
          className={`min-h-11 rounded-lg border px-4 py-1 text-[11px] font-bold tracking-wide uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a2120] ${
            flagMode
              ? "border-[#ffabef] text-[#ffabef]"
              : "border-[rgba(255,255,255,0.15)] text-[#dde4e2]"
          }`}
        >
          {flagMode ? "Flagging" : "Digging"}
        </button>
      </div>
      <div
        className="grid touch-manipulation gap-1"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0,1fr))` }}
        role="grid"
        aria-label="Minesweeper board"
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const c = cells?.[i];
          const open = c?.open ?? false;
          return (
            <button
              key={i}
              type="button"
              onClick={() => tap(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (status === "live" && cells && !cells[i].open) {
                  const next = cells.map((x) => ({ ...x }));
                  next[i].flag = !next[i].flag;
                  setCells(next);
                }
              }}
              className={`flex aspect-square w-11 items-center justify-center rounded text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62f3e4] ${
                open
                  ? "bg-[#0d1a17]"
                  : "bg-[#2f3635] hover:bg-[#3a4241] active:bg-[#243230]"
              }`}
              style={open && c?.adj ? { color: NUM_COLORS[c.adj] } : undefined}
              aria-label={
                open
                  ? c?.mine ? "Mine" : `${c?.adj ?? 0} adjacent mines`
                  : c?.flag ? "Flagged" : "Hidden"
              }
            >
              {open && c?.mine && <Bomb size={14} className="text-[#ff8a8a]" />}
              {open && !c?.mine && (c?.adj || "")}
              {!open && c?.flag && <Flag size={12} className="text-[#ffabef]" />}
            </button>
          );
        })}
      </div>
      <p
        aria-live="assertive"
        className="min-h-5 text-sm font-bold"
        style={{ color: status === "won" ? "#62f3e4" : status === "lost" ? "#ff8a8a" : "transparent" }}
      >
        {status === "won" ? "Grid cleared!" : status === "lost" ? "Boom, mine hit." : " "}
      </p>
    </div>
  );
}
