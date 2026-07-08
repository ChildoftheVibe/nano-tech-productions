"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcadeProps } from "./Minesweeper";

/** Artillery duel: set angle + power, arc a shell over the terrain, hit the
 *  enemy tank before it hits you. Wind shifts every turn. */

const W = 340;
const H = 240;

export function TankWars({ onFinish }: ArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(55);
  const [power, setPower] = useState(60);
  const [wind, setWind] = useState(0);
  const [turn, setTurn] = useState<"player" | "enemy" | "anim">("player");
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const finishedRef = useRef(false);

  const world = useRef<{
    terrain: number[];
    playerX: number;
    enemyX: number;
    shell: { x: number; y: number; vx: number; vy: number } | null;
    enemyErr: number;
  } | null>(null);

  // World is generated once on mount (inside the render-loop effect below);
  // random terrain can't be built during render (react-hooks/purity).
  const ensureWorld = useCallback(() => {
    if (world.current) return world.current;
    // Rolling terrain via layered sines.
    const terrain: number[] = [];
    const a = 20 + Math.random() * 20;
    const b = 8 + Math.random() * 10;
    const p1 = Math.random() * Math.PI * 2;
    const p2 = Math.random() * Math.PI * 2;
    for (let x = 0; x <= W; x++) {
      terrain.push(
        H - 50 - a * Math.sin(x / 90 + p1) * 0.5 - b * Math.sin(x / 37 + p2),
      );
    }
    world.current = {
      terrain,
      playerX: 30 + Math.random() * 40,
      enemyX: W - 70 + Math.random() * 40,
      shell: null,
      enemyErr: 30,
    };
    return world.current;
  }, []);

  const end = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setStatus(won ? "won" : "lost");
      onFinish(won);
    },
    [onFinish],
  );

  const groundY = (x: number) => {
    const t = world.current?.terrain;
    if (!t) return H;
    return t[Math.max(0, Math.min(W, Math.round(x)))];
  };

  const fire = useCallback(
    function fireFn(from: "player" | "enemy", deg: number, pow: number) {
      const w = ensureWorld();
      const x0 = from === "player" ? w.playerX : w.enemyX;
      const rad = (deg * Math.PI) / 180;
      const sign = from === "player" ? 1 : -1;
      const v = pow * 0.09;
      w.shell = {
        x: x0,
        y: groundY(x0) - 10,
        vx: sign * v * Math.cos(rad),
        vy: -v * Math.sin(rad),
      };
      setTurn("anim");

      const step = () => {
        const sh = w.shell;
        if (!sh) return;
        sh.vx += wind * 0.0012;
        sh.vy += 0.09;
        sh.x += sh.vx;
        sh.y += sh.vy;
        const targetX = from === "player" ? w.enemyX : w.playerX;
        if (Math.abs(sh.x - targetX) < 14 && Math.abs(sh.y - groundY(targetX)) < 16) {
          w.shell = null;
          end(from === "player");
          return;
        }
        if (sh.x < -20 || sh.x > W + 20 || sh.y > groundY(sh.x)) {
          // Miss — crater near-miss learning for the AI.
          if (from === "enemy") w.enemyErr = Math.max(6, w.enemyErr * 0.55);
          w.shell = null;
          setWind(Math.round((Math.random() - 0.5) * 40));
          if (from === "player") {
            // Enemy's turn: aim with decaying error.
            setTurn("enemy");
            window.setTimeout(() => {
              const dist = w.enemyX - w.playerX;
              const ideal = Math.sqrt((dist * 0.09) / (0.09 * 0.09)) * 0.09 * 10.5;
              const pow2 = Math.min(95, Math.max(35, ideal + (Math.random() - 0.5) * w.enemyErr));
              fireFn("enemy", 55, pow2);
            }, 700);
          } else {
            setTurn("player");
          }
          return;
        }
        window.setTimeout(step, 16);
      };
      step();
    },
    [end, wind, ensureWorld],
  );

  // Render loop (also generates the world on mount).
  useEffect(() => {
    ensureWorld();
    let raf = 0;
    const draw = () => {
      const ctx = canvasRef.current?.getContext("2d");
      const w = world.current;
      if (ctx && w) {
        ctx.fillStyle = "#090f0e";
        ctx.fillRect(0, 0, W, H);
        // Terrain.
        ctx.fillStyle = "#1a2120";
        ctx.beginPath();
        ctx.moveTo(0, H);
        w.terrain.forEach((y, x) => ctx.lineTo(x, y));
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#62f3e4";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        w.terrain.forEach((y, x) => (x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        // Tanks.
        const tank = (x: number, color: string, flip: boolean) => {
          const y = groundY(x);
          ctx.fillStyle = color;
          ctx.fillRect(x - 10, y - 8, 20, 8);
          ctx.fillRect(x - 6, y - 13, 12, 6);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y - 11);
          const rad = (angle * Math.PI) / 180;
          ctx.lineTo(x + (flip ? -1 : 1) * 14 * Math.cos(rad), y - 11 - 14 * Math.sin(rad));
          ctx.stroke();
        };
        tank(w.playerX, "#62f3e4", false);
        tank(w.enemyX, "#ff8a8a", true);
        // Shell.
        if (w.shell) {
          ctx.fillStyle = "#f0c674";
          ctx.beginPath();
          ctx.arc(w.shell.x, w.shell.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Wind indicator.
        ctx.fillStyle = "#bbcac6";
        ctx.font = "10px monospace";
        ctx.fillText(`wind ${wind > 0 ? "→" : wind < 0 ? "←" : "·"} ${Math.abs(wind)}`, W / 2 - 30, 14);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [angle, wind, ensureWorld]);

  const slider =
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-[#2f3635] accent-[#62f3e4]";

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-[#bbcac6]">
        {turn === "player" ? "Your shot — set angle and power" : turn === "enemy" ? "Enemy is aiming…" : "Shell away…"}
      </p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-[340px] rounded-lg border border-[rgba(255,255,255,0.1)]"
        aria-label="Tank Wars battlefield"
      />
      {status === "live" ? (
        <div className="flex w-full max-w-[340px] flex-col gap-2">
          <label className="flex items-center gap-2 text-[11px] text-[#bbcac6]">
            <span className="w-12">Angle</span>
            <input
              type="range" min={15} max={85} value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className={slider} disabled={turn !== "player"}
            />
            <span className="w-8 text-right tabular-nums text-[#dde4e2]">{angle}°</span>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-[#bbcac6]">
            <span className="w-12">Power</span>
            <input
              type="range" min={30} max={95} value={power}
              onChange={(e) => setPower(Number(e.target.value))}
              className={slider} disabled={turn !== "player"}
            />
            <span className="w-8 text-right tabular-nums text-[#dde4e2]">{power}</span>
          </label>
          <button
            type="button"
            onClick={() => fire("player", angle, power)}
            disabled={turn !== "player"}
            className="min-h-11 rounded-lg bg-[#62f3e4] px-5 py-2 text-xs font-bold tracking-[0.06em] text-[#003733] uppercase transition-transform hover:scale-[1.02] disabled:opacity-40"
          >
            Fire
          </button>
        </div>
      ) : (
        <p className="text-sm font-bold" style={{ color: status === "won" ? "#62f3e4" : "#ff8a8a" }}>
          {status === "won" ? "Direct hit — enemy destroyed!" : "Your tank is smoked."}
        </p>
      )}
    </div>
  );
}
