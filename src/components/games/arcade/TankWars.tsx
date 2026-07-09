"use client";

import { useCallback, useRef, useState } from "react";
import type { ArcadeProps } from "./Minesweeper";
import { MuteToggle, RetroFrame } from "./retro64";
import {
  PALETTE,
  Particles,
  Shake,
  applyShake,
  glowSprite,
  scanlineOverlay,
  shade,
  useRetroLoop,
  useSfx,
  vignette,
  withAlpha,
} from "./retro64";

/** Artillery duel: set angle + power, arc a shell over the terrain, hit the
 *  enemy tank before it hits you. Wind shifts every turn. */

const W = 340;
const H = 240;

type Trail = { x: number; y: number; age: number };

export function TankWars({ onFinish }: ArcadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(55);
  const [power, setPower] = useState(60);
  const [wind, setWind] = useState(0);
  const [turn, setTurn] = useState<"player" | "enemy" | "anim">("player");
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const finishedRef = useRef(false);
  const sfx = useSfx();
  const particles = useRef(new Particles());
  const shake = useRef(new Shake());
  const trail = useRef<Trail[]>([]);
  const skyGradient = useRef<CanvasGradient | null>(null);

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
      // Tuned easy: the enemy starts with a wide aiming error and only sharpens
      // slowly (see the decay on miss below), so the player usually lands a hit
      // first.
      enemyErr: 46,
    };
    return world.current;
  }, []);

  const end = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setStatus(won ? "won" : "lost");
      sfx.play(won ? "win" : "lose");
      onFinish(won);
    },
    [onFinish, sfx],
  );

  const groundY = (x: number) => {
    const t = world.current?.terrain;
    if (!t) return H;
    return t[Math.max(0, Math.min(W, Math.round(x)))];
  };

  const explode = useCallback((x: number, y: number) => {
    particles.current.burst(x, y, {
      count: 26,
      color: [PALETTE.gold, PALETTE.coral, "#fff3d0"],
      speed: 150,
      life: 0.5,
      size: 3,
      gravity: 120,
    });
    shake.current.trigger(7, 0.3);
    sfx.play("explode");
    trail.current = [];
  }, [sfx]);

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
      trail.current = [];
      if (from === "player") sfx.play("shoot");
      setTurn("anim");

      const step = () => {
        const sh = w.shell;
        if (!sh) return;
        sh.vx += wind * 0.0012;
        sh.vy += 0.09;
        sh.x += sh.vx;
        sh.y += sh.vy;
        trail.current.push({ x: sh.x, y: sh.y, age: 0 });
        if (trail.current.length > 14) trail.current.shift();
        const targetX = from === "player" ? w.enemyX : w.playerX;
        if (Math.abs(sh.x - targetX) < 14 && Math.abs(sh.y - groundY(targetX)) < 16) {
          explode(sh.x, sh.y);
          w.shell = null;
          end(from === "player");
          return;
        }
        if (sh.x < -20 || sh.x > W + 20 || sh.y > groundY(sh.x)) {
          // Miss — crater near-miss learning for the AI.
          explode(sh.x, Math.min(sh.y, groundY(sh.x)));
          if (from === "enemy") w.enemyErr = Math.max(20, w.enemyErr * 0.82);
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
    [end, wind, ensureWorld, explode, sfx],
  );

  // Render loop (also generates the world on mount). Physics for the shell's
  // flight stays on its own window.setTimeout(step, 16) loop above (untouched
  // timing); this loop only redraws every frame and drives ambient juice
  // (trail fade, particles, shake, wind streak parallax).
  const { reducedMotion } = useRetroLoop(
    (dt) => {
      ensureWorld();
      particles.current.update(dt);
      shake.current.update(dt);
      trail.current.forEach((t) => (t.age += dt));

      const ctx = canvasRef.current?.getContext("2d");
      const w = world.current;
      if (!ctx || !w) return;

      if (!skyGradient.current) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#1a2b3d");
        g.addColorStop(0.6, "#12211f");
        g.addColorStop(1, PALETTE.felt);
        skyGradient.current = g;
      }

      ctx.save();
      ctx.fillStyle = skyGradient.current;
      ctx.fillRect(0, 0, W, H);

      applyShake(ctx, shake.current);

      // Parallax hill silhouettes (cheap two-layer sine ridges behind the terrain).
      ctx.fillStyle = "rgba(98,243,228,0.05)";
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H - 30 - Math.sin(x / 60) * 14);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,171,239,0.04)";
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H - 16 - Math.cos(x / 44 + 1) * 10);
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();

      // Shaded terrain (gradient fill + rim highlight).
      const groundGrad = ctx.createLinearGradient(0, H - 90, 0, H);
      groundGrad.addColorStop(0, shade(PALETTE.felt, 0.5));
      groundGrad.addColorStop(1, "#060a09");
      ctx.fillStyle = groundGrad;
      ctx.beginPath();
      ctx.moveTo(0, H);
      w.terrain.forEach((y, x) => ctx.lineTo(x, y));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.teal;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      w.terrain.forEach((y, x) => (x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();

      // Tanks: chunky hull + shaded turret + barrel.
      const tank = (x: number, color: string, flip: boolean) => {
        const y = groundY(x);
        const dark = shade(color, -0.35);
        ctx.fillStyle = dark;
        ctx.fillRect(x - 10, y - 6, 20, 8);
        ctx.fillStyle = color;
        ctx.fillRect(x - 10, y - 8, 20, 6);
        ctx.fillStyle = shade(color, -0.2);
        ctx.fillRect(x - 6, y - 14, 12, 7);
        ctx.fillStyle = color;
        ctx.fillRect(x - 6, y - 15, 12, 4);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 11);
        const rad = (angle * Math.PI) / 180;
        ctx.lineTo(x + (flip ? -1 : 1) * 14 * Math.cos(rad), y - 11 - 14 * Math.sin(rad));
        ctx.stroke();
      };
      tank(w.playerX, PALETTE.teal, false);
      tank(w.enemyX, PALETTE.coral, true);

      // Shell + fading glow trail.
      trail.current.forEach((t) => {
        const life = Math.max(0, 1 - t.age / 0.35);
        if (life <= 0) return;
        glowSprite(ctx, t.x, t.y, 1.6 * life, PALETTE.gold, { blur: 6, alpha: life * 0.6 });
      });
      if (w.shell) glowSprite(ctx, w.shell.x, w.shell.y, 3, PALETTE.gold, { blur: 12 });

      particles.current.draw(ctx);

      // Wind streaks: faint horizontal dashes drifting with the wind sign.
      if (!reducedMotion && wind !== 0) {
        ctx.strokeStyle = withAlpha(PALETTE.teal, 0.18);
        ctx.lineWidth = 1;
        const dir = Math.sign(wind);
        for (let i = 0; i < 5; i++) {
          const y = 20 + i * 14;
          const phase = ((performance.now() / 400) * dir + i * 30) % (W + 40);
          const x = dir > 0 ? phase - 40 : W - phase + 40;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + dir * 12, y);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Wind readout (HUD, unaffected by shake).
      ctx.fillStyle = "#bbcac6";
      ctx.font = "10px monospace";
      ctx.fillText(`wind ${wind > 0 ? "→" : wind < 0 ? "←" : "·"} ${Math.abs(wind)}`, W / 2 - 30, 14);

      scanlineOverlay(ctx, W, H, { alpha: 0.05 });
      vignette(ctx, W, H, { strength: 0.4 });
    },
    { paused: status !== "live" },
  );

  const slider =
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-[#2f3635] accent-[#62f3e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17]";

  return (
    <div className="flex flex-col items-center gap-3">
      <p aria-live="polite" className="text-xs text-[#bbcac6]">
        {turn === "player" ? "Your shot. Set angle and power." : turn === "enemy" ? "Enemy is aiming…" : "Shell away…"}
      </p>
      <RetroFrame accent={PALETTE.gold} className="w-full max-w-[340px]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full"
          role="img"
          aria-label="Tank Wars battlefield"
        />
      </RetroFrame>
      {status === "live" ? (
        <div className="flex w-full max-w-[340px] flex-col gap-2">
          <label className="flex items-center gap-2 text-[11px] text-[#bbcac6]">
            <span className="w-12">Angle</span>
            <input
              type="range" min={15} max={85} value={angle}
              aria-label="Barrel angle in degrees"
              onChange={(e) => setAngle(Number(e.target.value))}
              className={slider} disabled={turn !== "player"}
            />
            <span className="w-8 text-right tabular-nums text-[#dde4e2]">{angle}°</span>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-[#bbcac6]">
            <span className="w-12">Power</span>
            <input
              type="range" min={30} max={95} value={power}
              aria-label="Shot power"
              onChange={(e) => setPower(Number(e.target.value))}
              className={slider} disabled={turn !== "player"}
            />
            <span className="w-8 text-right tabular-nums text-[#dde4e2]">{power}</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fire("player", angle, power)}
              disabled={turn !== "player"}
              className="min-h-11 flex-1 rounded-lg bg-[#62f3e4] px-5 py-2 text-xs font-bold tracking-[0.06em] text-[#003733] uppercase transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
            >
              Fire
            </button>
            <MuteToggle />
          </div>
        </div>
      ) : (
        <p aria-live="assertive" className="text-sm font-bold" style={{ color: status === "won" ? "#62f3e4" : "#ff8a8a" }}>
          {status === "won" ? "Direct hit, enemy destroyed!" : "Your tank is smoked."}
        </p>
      )}
    </div>
  );
}
