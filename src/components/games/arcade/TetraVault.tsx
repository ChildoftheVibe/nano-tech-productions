"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { ArcadeProps } from "./Minesweeper";
import { ArcadeEndActions, ArcadeStatus, PadButton } from "./ArcadeControls";
import {
  PALETTE,
  Particles,
  RetroFrame,
  Shake,
  MuteToggle,
  applyShake,
  bevelRect,
  scanlineOverlay,
  useRetroLoop,
  useSfx,
  vignette,
} from "./retro64";

/** Falling-block puzzle: clear TARGET_LINES to win. Original implementation
 *  (not Tetris™) with the classic seven tetromino shapes, rendered as chunky
 *  N64-style beveled blocks. */

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

const randomShapeIndex = () => Math.floor(Math.random() * SHAPES.length);

export function TetraVault({ onFinish, onPlayAgain, onReturn }: ArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lines, setLines] = useState(0);
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  // Pre-rolled next tetromino (shown in the NEXT preview). `nextRef` holds the
  // authoritative value that spawn() consumes; `nextIdx` mirrors it for render.
  const [nextIdx, setNextIdx] = useState(randomShapeIndex);
  const nextRef = useRef(nextIdx);
  const state = useRef({
    grid: Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null)),
    piece: null as Piece | null,
    lines: 0,
    over: false,
    dropMs: 780,
    lastDrop: 0,
    glow: 0, // active-piece pulse phase
  });
  const finishedRef = useRef(false);
  const sfx = useSfx();
  const particles = useRef(new Particles());
  const shake = useRef(new Shake());
  const bgGradient = useRef<CanvasGradient | null>(null);

  const end = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      state.current.over = true;
      setStatus(won ? "won" : "lost");
      sfx.play(won ? "win" : "lose");
      onFinish(won);
    },
    [onFinish, sfx],
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
    // Consume the pre-rolled next piece, then roll a fresh one for the preview.
    const i = nextRef.current;
    nextRef.current = randomShapeIndex();
    setNextIdx(nextRef.current);
    const shape = SHAPES[i];
    const piece: Piece = {
      shape,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: -shape.length + 1,
      color: COLORS[i],
    };
    if (collides({ ...piece, y: 0 }, state.current.grid)) {
      // Top-out burst at the vault's ceiling.
      particles.current.burst(Math.round((COLS * CELL) / 2), CELL, {
        count: 24,
        color: [PALETTE.coral, PALETTE.gold],
        speed: 130,
        life: 0.6,
        gravity: 140,
      });
      shake.current.trigger(6, 0.35);
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
    const clearedRows: number[] = [];
    s.grid.forEach((row, y) => {
      if (row.every((cell) => cell)) clearedRows.push(y);
    });
    s.grid = s.grid.filter((row) => row.some((cell) => !cell));
    const cleared = ROWS - s.grid.length;
    while (s.grid.length < ROWS) s.grid.unshift(Array<string | null>(COLS).fill(null));
    if (cleared) {
      s.lines += cleared;
      s.dropMs = Math.max(460, 780 - s.lines * 25);
      setLines(s.lines);
      // Chunky particle burst across every cleared row.
      for (const y of clearedRows) {
        for (let x = 0; x < COLS; x += 2) {
          particles.current.burst(x * CELL + CELL / 2, y * CELL + CELL / 2, {
            count: 4,
            color: [PALETTE.gold, PALETTE.teal, PALETTE.pink],
            speed: 110,
            life: 0.4,
            gravity: 90,
          });
        }
      }
      shake.current.trigger(cleared >= 2 ? 5 : 3, 0.25);
      sfx.play("clear");
      if (s.lines >= TARGET_LINES) {
        end(true);
        return;
      }
    } else {
      sfx.play("place");
    }
    spawn();
  }, [end, spawn, sfx]);

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

  useEffect(() => {
    spawn();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount, same as before
  }, []);

  // Declared before useRetroLoop so it's unambiguously available inside the
  // callback passed to it below.
  const reducedMotion = !!useReducedMotion();

  // Render + drop-timer loop. `elapsedMs` is the same rAF timestamp the
  // original code used for the drop-timer comparison, so the fall-speed
  // logic is untouched — only how we get the timestamp changed.
  useRetroLoop(
    (dt, elapsedMs) => {
      const s = state.current;
      if (!s.over && elapsedMs - s.lastDrop > s.dropMs) {
        s.lastDrop = elapsedMs;
        move(0, 1);
      }
      s.glow += dt * 4;
      particles.current.update(dt);
      shake.current.update(dt);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;
      const w = COLS * CELL;
      const h = ROWS * CELL;

      if (!bgGradient.current) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#12211e");
        g.addColorStop(1, PALETTE.base);
        bgGradient.current = g;
      }

      ctx.save();
      ctx.fillStyle = bgGradient.current;
      ctx.fillRect(0, 0, w, h);

      applyShake(ctx, shake.current);

      s.grid.forEach((row, y) =>
        row.forEach((c, x) => {
          if (c) bevelRect(ctx, x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, c, { radius: 3 });
        }),
      );

      const p = s.piece;
      if (p) {
        const pulse = reducedMotion ? 8 : 8 + Math.sin(s.glow) * 4;
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = pulse;
        p.shape.forEach((row, r) =>
          row.forEach((v, c) => {
            if (v && p.y + r >= 0) {
              bevelRect(ctx, (p.x + c) * CELL + 1, (p.y + r) * CELL + 1, CELL - 2, CELL - 2, p.color, { radius: 3 });
            }
          }),
        );
        ctx.restore();
      }

      particles.current.draw(ctx);
      ctx.restore();

      scanlineOverlay(ctx, w, h, { alpha: 0.05 });
      vignette(ctx, w, h, { strength: 0.35 });
    },
    { paused: status !== "live" },
  );

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
        <span className="font-[family-name:var(--font-arcade)] text-[10px] tracking-tight text-[#dde4e2]">
          {lines}
        </span>{" "}
        cleared so far.
      </ArcadeStatus>
      <div className="flex items-start gap-3">
        <RetroFrame accent={PALETTE.teal}>
          <canvas
            ref={canvasRef}
            width={COLS * CELL}
            height={ROWS * CELL}
            role="img"
            aria-label={`Tetra Vault board, ${lines} of ${TARGET_LINES} lines cleared`}
          />
        </RetroFrame>
        <div
          className="flex flex-col items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#12211e] px-3 py-2.5"
          aria-label="Next piece preview"
        >
          <span className="font-[family-name:var(--font-arcade)] text-[9px] tracking-tight text-[#bbcac6]">
            NEXT
          </span>
          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${SHAPES[nextIdx][0].length}, 12px)` }}
          >
            {SHAPES[nextIdx].flatMap((row, r) =>
              row.map((v, c) => (
                <span
                  key={`${r}-${c}`}
                  className="h-3 w-3 rounded-[2px]"
                  style={
                    v
                      ? { background: COLORS[nextIdx], boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.25)` }
                      : { background: "transparent" }
                  }
                />
              )),
            )}
          </div>
        </div>
      </div>
      {status === "live" ? (
        <div className="flex gap-2" role="group" aria-label="Touch controls">
          <PadButton label="Move left" onPress={() => move(-1, 0)}>◀</PadButton>
          <PadButton label="Rotate piece" onPress={() => move(0, 0, true)}>⟳</PadButton>
          <PadButton label="Move right" onPress={() => move(1, 0)}>▶</PadButton>
          <PadButton label="Hard drop" onPress={hardDrop}>▼</PadButton>
          <MuteToggle />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <ArcadeStatus tone={status === "won" ? "win" : "lose"}>
            {status === "won" ? "Vault breached!" : "Stack topped out."}
          </ArcadeStatus>
          {onPlayAgain && onReturn && <ArcadeEndActions onPlayAgain={onPlayAgain} onReturn={onReturn} />}
        </div>
      )}
    </div>
  );
}
