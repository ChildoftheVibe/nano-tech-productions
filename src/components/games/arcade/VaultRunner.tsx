"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcadeProps } from "./Minesweeper";
import { ArcadeStatus, HoldButton, PadButton } from "./ArcadeControls";

/** Side-scrolling platformer stage (original, classic run-and-jump spirit):
 *  run right, clear gaps and spikes, touch the portal flag to win. */

const W = 320;
const H = 260;
const GROUND = 210;
// Tuned easy: a shorter run with widely-spaced, smaller obstacles (see the
// level generator) so reaching the portal flag is the likely outcome.
const LEVEL_END = 1600;

type Rect = { x: number; w: number };

export function VaultRunner({ onFinish }: ArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const finishedRef = useRef(false);
  const input = useRef({ left: false, right: false, jump: false });

  const end = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setStatus(won ? "won" : "lost");
      onFinish(won);
    },
    [onFinish],
  );

  useEffect(() => {
    // Deterministic-ish level: gaps and spikes spaced along the run.
    const gaps: Rect[] = [];
    const spikes: Rect[] = [];
    let x = 380;
    while (x < LEVEL_END - 300) {
      // Smaller gaps (clearable with one jump) and single spike clusters,
      // spaced far enough apart to line up each jump comfortably.
      if (Math.random() < 0.5) gaps.push({ x, w: 40 + Math.random() * 22 });
      else spikes.push({ x, w: 34 });
      x += 300 + Math.random() * 190;
    }

    const s = { px: 40, py: GROUND, vx: 0, vy: 0, grounded: true, over: false };

    const overGap = (px: number) =>
      gaps.some((g) => px > g.x && px < g.x + g.w);

    let raf = 0;
    const tick = () => {
      if (!s.over) {
        const accel = 0.5;
        if (input.current.right) s.vx = Math.min(3.4, s.vx + accel);
        else if (input.current.left) s.vx = Math.max(-2.4, s.vx - accel);
        else s.vx *= 0.85;
        if (input.current.jump && s.grounded) {
          s.vy = -9.9;
          s.grounded = false;
        }
        input.current.jump = false;

        s.px = Math.max(10, s.px + s.vx);
        s.vy += 0.5;
        s.py += s.vy;

        if (s.py >= GROUND && !overGap(s.px)) {
          s.py = GROUND;
          s.vy = 0;
          s.grounded = true;
        } else {
          s.grounded = false;
        }

        if (s.py > H + 30) { s.over = true; end(false); }
        if (
          s.py >= GROUND - 2 &&
          spikes.some((sp) => s.px > sp.x - 6 && s.px < sp.x + sp.w + 6)
        ) {
          s.over = true;
          end(false);
        }
        if (s.px >= LEVEL_END) { s.over = true; end(true); }
      }

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const cam = Math.max(0, Math.min(s.px - W / 3, LEVEL_END - W + 60));
        ctx.fillStyle = "#090f0e";
        ctx.fillRect(0, 0, W, H);
        // Parallax glow.
        ctx.fillStyle = "rgba(98,243,228,0.05)";
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(((i * 420 - cam * 0.4) % (W + 200)) - 100, 30 + (i % 3) * 40, 80, 8);
        }
        // Ground segments (skip gaps).
        ctx.fillStyle = "#1a2120";
        let gx = 0;
        const edges = [...gaps].sort((a, b) => a.x - b.x);
        for (const g of edges) {
          ctx.fillRect(gx - cam, GROUND + 14, g.x - gx, H - GROUND);
          gx = g.x + g.w;
        }
        ctx.fillRect(gx - cam, GROUND + 14, LEVEL_END + 400 - gx, H - GROUND);
        ctx.fillStyle = "#62f3e4";
        ctx.fillRect(0 - cam, GROUND + 14, LEVEL_END + 400, 2);
        // Spikes.
        ctx.fillStyle = "#ff8a8a";
        for (const sp of spikes) {
          for (let i = 0; i < 3; i++) {
            const bx = sp.x + i * 12 - cam;
            ctx.beginPath();
            ctx.moveTo(bx, GROUND + 14);
            ctx.lineTo(bx + 6, GROUND - 2);
            ctx.lineTo(bx + 12, GROUND + 14);
            ctx.closePath();
            ctx.fill();
          }
        }
        // Portal flag.
        ctx.fillStyle = "#ffabef";
        ctx.fillRect(LEVEL_END - cam, GROUND - 46, 4, 60);
        ctx.beginPath();
        ctx.arc(LEVEL_END - cam + 2, GROUND - 52, 10, 0, Math.PI * 2);
        ctx.fill();
        // Player.
        ctx.fillStyle = "#62f3e4";
        ctx.fillRect(s.px - 8 - cam, s.py - 18, 16, 18);
        ctx.fillStyle = "#003733";
        ctx.fillRect(s.px - 4 - cam, s.py - 14, 3, 3);
        ctx.fillRect(s.px + 1 - cam, s.py - 14, 3, 3);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowLeft") { input.current.left = down; e.preventDefault(); }
      if (e.key === "ArrowRight") { input.current.right = down; e.preventDefault(); }
      if ((e.key === "ArrowUp" || e.key === " ") && down) { input.current.jump = true; e.preventDefault(); }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [end]);

  return (
    <div className="flex flex-col items-center gap-3">
      <ArcadeStatus>Reach the portal flag. Dodge gaps and spikes.</ArcadeStatus>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-[320px] rounded-lg border border-[rgba(255,255,255,0.1)]"
        role="img"
        aria-label="Vault Runner stage"
      />
      {status === "live" ? (
        <div className="flex gap-2" role="group" aria-label="Touch controls">
          <HoldButton label="Move left" onHoldChange={(h) => (input.current.left = h)}>◀</HoldButton>
          <PadButton label="Jump" onPress={() => (input.current.jump = true)}>⤒</PadButton>
          <HoldButton label="Move right" onHoldChange={(h) => (input.current.right = h)}>▶</HoldButton>
        </div>
      ) : (
        <ArcadeStatus tone={status === "won" ? "win" : "lose"}>
          {status === "won" ? "Stage complete!" : "Wiped out."}
        </ArcadeStatus>
      )}
    </div>
  );
}
