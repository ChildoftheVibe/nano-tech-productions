"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcadeProps } from "./Minesweeper";

/** Fixed-shooter wave defense (original, in the spirit of classic arcade
 *  shooters): destroy the whole alien formation to win. */

const W = 320;
const H = 400;

type Alien = { x: number; y: number; alive: boolean };
type Shot = { x: number; y: number; vy: number };

export function StarVanguard({ onFinish }: ArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const finishedRef = useRef(false);
  const input = useRef({ left: false, right: false });

  const end = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setStatus(won ? "won" : "lost");
      onFinish(won);
    },
    [onFinish],
  );

  const fireRef = useRef<() => void>(() => {});

  useEffect(() => {
    const aliens: Alien[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        aliens.push({ x: 30 + c * 38, y: 36 + r * 30, alive: true });
      }
    }
    const s = {
      px: W / 2,
      shots: [] as Shot[],
      enemyShots: [] as Shot[],
      dir: 1,
      speed: 0.4,
      lastEnemyFire: 0,
      over: false,
      lastShot: 0,
    };

    fireRef.current = () => {
      const now = performance.now();
      if (s.over || now - s.lastShot < 280) return;
      s.lastShot = now;
      s.shots.push({ x: s.px, y: H - 34, vy: -6 });
    };

    let raf = 0;
    const tick = (t: number) => {
      if (!s.over) {
        // Player movement.
        if (input.current.left) s.px = Math.max(14, s.px - 3.2);
        if (input.current.right) s.px = Math.min(W - 14, s.px + 3.2);

        // Formation movement.
        const alive = aliens.filter((a) => a.alive);
        const xs = alive.map((a) => a.x);
        if (xs.length && (Math.max(...xs) > W - 20 && s.dir > 0)) {
          s.dir = -1;
          alive.forEach((a) => (a.y += 12));
        } else if (xs.length && (Math.min(...xs) < 20 && s.dir < 0)) {
          s.dir = 1;
          alive.forEach((a) => (a.y += 12));
        }
        const speed = s.speed + (1 - alive.length / aliens.length) * 1.2;
        alive.forEach((a) => (a.x += s.dir * speed));

        // Enemy fire.
        if (alive.length && t - s.lastEnemyFire > 900) {
          s.lastEnemyFire = t;
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          s.enemyShots.push({ x: shooter.x, y: shooter.y + 10, vy: 3 });
        }

        // Shots.
        s.shots.forEach((sh) => (sh.y += sh.vy));
        s.enemyShots.forEach((sh) => (sh.y += sh.vy));
        s.shots = s.shots.filter((sh) => sh.y > -10);
        s.enemyShots = s.enemyShots.filter((sh) => sh.y < H + 10);

        // Collisions.
        for (const sh of s.shots) {
          const hit = alive.find(
            (a) => a.alive && Math.abs(a.x - sh.x) < 14 && Math.abs(a.y - sh.y) < 12,
          );
          if (hit) {
            hit.alive = false;
            sh.y = -100;
          }
        }
        if (
          s.enemyShots.some((sh) => Math.abs(sh.x - s.px) < 12 && sh.y > H - 40 && sh.y < H - 16) ||
          alive.some((a) => a.y > H - 60)
        ) {
          s.over = true;
          end(false);
        }
        if (aliens.every((a) => !a.alive)) {
          s.over = true;
          end(true);
        }
      }

      // Render.
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#090f0e";
        ctx.fillRect(0, 0, W, H);
        // Starfield.
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        for (let i = 0; i < 40; i++) {
          ctx.fillRect((i * 53) % W, (i * 97 + t * 0.02 * (1 + (i % 3))) % H, 1.5, 1.5);
        }
        // Aliens.
        aliens.forEach((a) => {
          if (!a.alive) return;
          ctx.fillStyle = "#ffabef";
          ctx.fillRect(a.x - 10, a.y - 6, 20, 12);
          ctx.fillStyle = "#090f0e";
          ctx.fillRect(a.x - 5, a.y - 2, 3, 3);
          ctx.fillRect(a.x + 2, a.y - 2, 3, 3);
        });
        // Player.
        ctx.fillStyle = "#62f3e4";
        ctx.beginPath();
        ctx.moveTo(s.px, H - 36);
        ctx.lineTo(s.px - 12, H - 16);
        ctx.lineTo(s.px + 12, H - 16);
        ctx.closePath();
        ctx.fill();
        // Shots.
        ctx.fillStyle = "#62f3e4";
        s.shots.forEach((sh) => ctx.fillRect(sh.x - 1.5, sh.y - 6, 3, 8));
        ctx.fillStyle = "#ff8a8a";
        s.enemyShots.forEach((sh) => ctx.fillRect(sh.x - 1.5, sh.y, 3, 8));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowLeft") { input.current.left = down; e.preventDefault(); }
      if (e.key === "ArrowRight") { input.current.right = down; e.preventDefault(); }
      if (e.key === " " && down) { fireRef.current(); e.preventDefault(); }
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

  const hold = (key: "left" | "right") => ({
    onPointerDown: () => (input.current[key] = true),
    onPointerUp: () => (input.current[key] = false),
    onPointerLeave: () => (input.current[key] = false),
  });
  const pad =
    "flex h-11 w-16 touch-none items-center justify-center rounded-lg border border-[rgba(255,255,255,0.15)] bg-[#242b2a] text-lg text-[#dde4e2] active:bg-[#2f3635] select-none";

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-[#bbcac6]">Destroy the formation before it lands</p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-[320px] rounded-lg border border-[rgba(255,255,255,0.1)]"
        aria-label="Star Vanguard playfield"
      />
      {status === "live" ? (
        <div className="flex gap-2" aria-label="Touch controls">
          <button type="button" className={pad} {...hold("left")} aria-label="Move left">◀</button>
          <button type="button" className={pad} onClick={() => fireRef.current()} aria-label="Fire">✦</button>
          <button type="button" className={pad} {...hold("right")} aria-label="Move right">▶</button>
        </div>
      ) : (
        <p className="text-sm font-bold" style={{ color: status === "won" ? "#62f3e4" : "#ff8a8a" }}>
          {status === "won" ? "Wave cleared!" : "Ship down."}
        </p>
      )}
    </div>
  );
}
