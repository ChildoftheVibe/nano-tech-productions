"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcadeProps } from "./Minesweeper";
import { ArcadeStatus, PadButton } from "./ArcadeControls";

/** Falling-block puzzle: clear TARGET_LINES to win. Original implementation
 *  (not Tetris™) with the classic seven tetromino shapes. */

const COLS = 10;
const ROWS = 18;
const CELL = 22;
// Tuned easy: only 4 lines to win, and the fall starts slow and ramps gently
// (see dropMs below) so a casual player reaches the target before topping out.
const TARGET_LINES = 4;

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],                    // I
  [[1, 1], [1, 1]],                  // O
  [[0, 1, 0], [1, 1, 1]],            // T
  [[1, 0, 0], [1, 1, 1]],            // J
  [[0, 0, 1], [1, 1, 1]],            // L
  [[0, 1, 1], [1, 1, 0]],            // S
  [[1, 1, 0], [0, 1, 1]],            // Z
];
const COLORS = ["#62f3e4", "#f0c674", "#ffabef", "#7aa2f7", "#ff9e64", "#7dd87d", "#ff8a8a"];

type Piece = { shape: number[][]; x: number; y: number; color: string };

const rotate = (s: number[][]) =>
  s[0].map((_, c) => s.map((row) => row[c]).reverse());

export function TetraVault({ onFinish }: ArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lines, setLines] = useState(0);
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const state = useRef({
    grid: Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null)),
    piece: null as Piece | null,
    lines: 0,
    over: false,
    dropMs: 780,
    lastDrop: 0,
  });
  const finishedRef = useRef(false);

  const end = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      state.current.over = true;
      setStatus(won ? "won" : "lost");
      onFinish(won);
    },
    [onFinish],
  );

  const collides = (p: Piece, grid: (string | null)[][]) => {
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (!p.shape[r][c]) continue;
        const x = p.x + c;
        const y = p.y + r;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && grid[y][x]) return true;
      }
    }
    return false;
  };

  const spawn = useCallback(() => {
    const i = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[i];
    const piece: Piece = {
      shape,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: -shape.length + 1,
      color: COLORS[i],
    };
    if (collides({ ...piece, y: 0 }, state.current.grid)) {
      end(false);
      return;
    }
    state.current.piece = piece;
  }, [end]);

  const lock = useCallback(() => {
    const s = state.current;
    const p = s.piece;
    if (!p) return;
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (p.shape[r][c] && p.y + r >= 0) s.grid[p.y + r][p.x + c] = p.color;
      }
    }
    s.grid = s.grid.filter((row) => row.some((cell) => !cell));
    const cleared = ROWS - s.grid.length;
    while (s.grid.length < ROWS) s.grid.unshift(Array<string | null>(COLS).fill(null));
    if (cleared) {
      s.lines += cleared;
      s.dropMs = Math.max(460, 780 - s.lines * 25);
      setLines(s.lines);
      if (s.lines >= TARGET_LINES) {
        end(true);
        return;
      }
    }
    spawn();
  }, [end, spawn]);

  const move = useCallback((dx: number, dy: number, rot = false) => {
    const s = state.current;
    if (s.over || !s.piece) return;
    const next: Piece = {
      ...s.piece,
      shape: rot ? rotate(s.piece.shape) : s.piece.shape,
      x: s.piece.x + dx,
      y: s.piece.y + dy,
    };
    if (!collides(next, s.grid)) {
      s.piece = next;
    } else if (dy > 0) {
      lock();
    }
  }, [lock]);

  const hardDrop = useCallback(() => {
    const s = state.current;
    if (s.over || !s.piece) return;
    while (!collides({ ...s.piece, y: s.piece.y + 1 }, s.grid)) s.piece.y++;
    lock();
  }, [lock]);

  // Game loop + render.
  useEffect(() => {
    spawn();
    let raf = 0;
    const draw = (t: number) => {
      const s = state.current;
      if (!s.over && t - s.lastDrop > s.dropMs) {
        s.lastDrop = t;
        move(0, 1);
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#090f0e";
        ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
        const cell = (x: number, y: number, color: string) => {
          ctx.fillStyle = color;
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        };
        s.grid.forEach((row, y) =>
          row.forEach((c, x) => { if (c) cell(x, y, c); }),
        );
        const p = s.piece;
        if (p) {
          p.shape.forEach((row, r) =>
            row.forEach((v, c) => {
              if (v && p.y + r >= 0) cell(p.x + c, p.y + r, p.color);
            }),
          );
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [move, spawn]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowLeft") move(-1, 0);
      if (e.key === "ArrowRight") move(1, 0);
      if (e.key === "ArrowDown") move(0, 1);
      if (e.key === "ArrowUp") move(0, 0, true);
      if (e.key === " ") hardDrop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, hardDrop]);

  return (
    <div className="flex flex-col items-center gap-3">
      <ArcadeStatus>
        Clear <span className="font-bold text-[#62f3e4]">{TARGET_LINES}</span> lines.{" "}
        <span className="font-bold text-[#dde4e2] tabular-nums">{lines}</span> cleared so far.
      </ArcadeStatus>
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="rounded-lg border border-[rgba(255,255,255,0.1)]"
        role="img"
        aria-label={`Tetra Vault board, ${lines} of ${TARGET_LINES} lines cleared`}
      />
      {status === "live" ? (
        <div className="flex gap-2" role="group" aria-label="Touch controls">
          <PadButton label="Move left" onPress={() => move(-1, 0)}>◀</PadButton>
          <PadButton label="Rotate piece" onPress={() => move(0, 0, true)}>⟳</PadButton>
          <PadButton label="Move right" onPress={() => move(1, 0)}>▶</PadButton>
          <PadButton label="Hard drop" onPress={hardDrop}>▼</PadButton>
        </div>
      ) : (
        <ArcadeStatus tone={status === "won" ? "win" : "lose"}>
          {status === "won" ? "Vault breached!" : "Stack topped out."}
        </ArcadeStatus>
      )}
    </div>
  );
}
