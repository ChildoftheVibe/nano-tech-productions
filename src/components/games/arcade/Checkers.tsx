"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ArcadeProps } from "./Minesweeper";

/** Checkers vs the vault AI. Capture all AI pieces (or stall it) to win.
 *  Simplified rules: captures optional, single jumps only, kings move both
 *  directions. */

type Piece = { player: boolean; king: boolean };
type Board = (Piece | null)[]; // 64 squares, row-major; player moves up (−8).

type Move = { from: number; to: number; capture: number | null };

const row = (i: number) => Math.floor(i / 8);
const col = (i: number) => i % 8;

function initialBoard(): Board {
  const b: Board = Array(64).fill(null);
  for (let i = 0; i < 64; i++) {
    if ((row(i) + col(i)) % 2 === 1) {
      if (row(i) < 3) b[i] = { player: false, king: false };
      if (row(i) > 4) b[i] = { player: true, king: false };
    }
  }
  return b;
}

function movesFor(b: Board, i: number): Move[] {
  const p = b[i];
  if (!p) return [];
  const dirs: number[] = [];
  if (p.player || p.king) dirs.push(-9, -7);
  if (!p.player || p.king) dirs.push(7, 9);
  const out: Move[] = [];
  for (const d of dirs) {
    const to = i + d;
    if (to < 0 || to >= 64 || Math.abs(col(to) - col(i)) !== 1) continue;
    if (!b[to]) {
      out.push({ from: i, to, capture: null });
    } else if (b[to]!.player !== p.player) {
      const jump = to + d;
      if (
        jump >= 0 && jump < 64 &&
        Math.abs(col(jump) - col(to)) === 1 &&
        !b[jump]
      ) {
        out.push({ from: i, to: jump, capture: to });
      }
    }
  }
  return out;
}

function allMoves(b: Board, player: boolean): Move[] {
  const out: Move[] = [];
  for (let i = 0; i < 64; i++) {
    if (b[i]?.player === player) out.push(...movesFor(b, i));
  }
  return out;
}

function applyMove(b: Board, m: Move): Board {
  const next = [...b];
  const p = { ...next[m.from]! };
  next[m.from] = null;
  if (m.capture !== null) next[m.capture] = null;
  if ((p.player && row(m.to) === 0) || (!p.player && row(m.to) === 7)) p.king = true;
  next[m.to] = p;
  return next;
}

export function Checkers({ onFinish }: ArcadeProps) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [selected, setSelected] = useState<number | null>(null);
  const [turn, setTurn] = useState<"player" | "ai">("player");
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const finishedRef = useRef(false);

  const end = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setStatus(won ? "won" : "lost");
      onFinish(won);
    },
    [onFinish],
  );

  const playerMoves = useMemo(
    () => (turn === "player" ? allMoves(board, true) : []),
    [board, turn],
  );

  // Win/loss detection on every board change.
  useEffect(() => {
    if (status !== "live") return;
    const aiPieces = board.filter((p) => p && !p.player).length;
    const myPieces = board.filter((p) => p?.player).length;
    if (aiPieces === 0 || (turn === "ai" && allMoves(board, false).length === 0)) {
      end(true);
      return;
    }
    if (myPieces === 0 || (turn === "player" && playerMoves.length === 0)) {
      end(false);
    }
  }, [board, turn, status, playerMoves, end]);

  // AI turn — deliberately beatable. Most turns it just plays a random legal
  // move; only occasionally does it bother to take an available capture, and it
  // never plans ahead or protects its pieces. This keeps the player winning
  // more often than losing.
  useEffect(() => {
    if (turn !== "ai" || status !== "live") return;
    const t = window.setTimeout(() => {
      const options = allMoves(board, false);
      if (!options.length) return; // handled by the effect above
      const pick = (pool: Move[]) => pool[Math.floor(Math.random() * pool.length)];
      const captures = options.filter((m) => m.capture !== null);
      // Take a capture only ~35% of the time; otherwise move at random.
      const move = captures.length && Math.random() < 0.35 ? pick(captures) : pick(options);
      setBoard((b) => applyMove(b, move));
      setTurn("player");
    }, 550);
    return () => window.clearTimeout(t);
  }, [turn, board, status]);

  const tap = (i: number) => {
    if (turn !== "player" || status !== "live") return;
    const p = board[i];
    if (p?.player) {
      setSelected(selected === i ? null : i);
      return;
    }
    if (selected !== null) {
      const move = playerMoves.find((m) => m.from === selected && m.to === i);
      if (move) {
        setBoard((b) => applyMove(b, move));
        setSelected(null);
        setTurn("ai");
      }
    }
  };

  const targets = selected !== null
    ? playerMoves.filter((m) => m.from === selected).map((m) => m.to)
    : [];

  return (
    <div className="flex flex-col items-center gap-3">
      <p aria-live="polite" className="min-h-4 text-xs text-[#bbcac6]">
        {status === "live"
          ? turn === "player" ? "Your move. You are teal." : "Vault AI is thinking…"
          : ""}
      </p>
      <div
        className="grid grid-cols-8 overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)]"
        role="grid"
        aria-label="Checkers board"
      >
        {board.map((p, i) => {
          const dark = (row(i) + col(i)) % 2 === 1;
          const isTarget = targets.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => tap(i)}
              disabled={!dark}
              className={`flex aspect-square w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#dde4e2] ${
                dark ? "bg-[#12403a]" : "bg-[#1a2120]"
              } ${selected === i ? "ring-2 ring-inset ring-[#62f3e4]" : ""} ${
                isTarget ? "ring-2 ring-inset ring-[#ffabef]" : ""
              }`}
              aria-label={
                p
                  ? `${p.player ? "Your" : "AI"} ${p.king ? "king" : "piece"}`
                  : isTarget ? "Move here" : "Empty square"
              }
            >
              {p && (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-md"
                  style={{
                    background: p.player ? "#62f3e4" : "#ff8a8a",
                    color: "#090f0e",
                  }}
                >
                  {p.king ? "♛" : ""}
                </span>
              )}
              {!p && isTarget && (
                <span className="h-2 w-2 rounded-full bg-[#ffabef]" />
              )}
            </button>
          );
        })}
      </div>
      <p
        aria-live="assertive"
        className="min-h-5 text-sm font-bold"
        style={{ color: status === "won" ? "#62f3e4" : status === "lost" ? "#ff8a8a" : "transparent" }}
      >
        {status === "won" ? "Board swept, you win!" : status === "lost" ? "The vault AI takes it." : " "}
      </p>
    </div>
  );
}
