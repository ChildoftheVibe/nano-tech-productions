/**
 * Retro64 — a tiny, dependency-free Canvas2D toolkit for giving the arcade
 * games a chunky N64/PS1-era look: beveled "3D" blocks, neon glow sprites,
 * shaded spheres, scanline/vignette overlays, parallax starfields, a pooled
 * particle system, and a screen-shake accumulator.
 *
 * Pure drawing/state utilities — no React, no DOM beyond CanvasRenderingContext2D.
 * Safe to import from any canvas-based game loop.
 */

/** The NTV brand palette, reused by every retro64-rendered game. */
export const PALETTE = {
  teal: "#62f3e4",
  pink: "#ffabef",
  gold: "#f0c674",
  coral: "#ff8a8a",
  felt: "#0d1a17",
  base: "#090f0e",
  white: "#f4f4f4",
} as const;

export type PaletteColor = (typeof PALETTE)[keyof typeof PALETTE];

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, n));

/** Lighten (amt > 0) or darken (amt < 0) a hex color. amt in [-1, 1]. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => clamp255(Math.round(amt >= 0 ? c + (255 - c) * amt : c + c * amt));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

/** hex -> "rgba(r,g,b,alpha)" */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * A chunky "raised button" block: flat color face with a light top/left
 * bevel edge and a dark bottom/right bevel edge, N64-cartridge style. This is
 * the single most load-bearing visual primitive in the retro64 toolkit.
 */
export function bevelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  opts: { bevel?: number; radius?: number; light?: string; dark?: string } = {},
) {
  if (w <= 0 || h <= 0) return;
  const bevel = Math.max(1, Math.min(opts.bevel ?? Math.round(Math.min(w, h) * 0.18), Math.min(w, h) / 2));
  const radius = opts.radius ?? 1;
  const light = opts.light ?? shade(color, 0.4);
  const dark = opts.dark ?? shade(color, -0.42);

  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();

  // Base face.
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  // Top edge (light).
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - bevel, y + bevel);
  ctx.lineTo(x + bevel, y + bevel);
  ctx.closePath();
  ctx.fill();

  // Left edge (light).
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + bevel, y + bevel);
  ctx.lineTo(x + bevel, y + h - bevel);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  // Bottom edge (dark).
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + bevel, y + h - bevel);
  ctx.lineTo(x + w - bevel, y + h - bevel);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // Right edge (dark).
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - bevel, y + h - bevel);
  ctx.lineTo(x + w - bevel, y + bevel);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** A soft neon sprite: filled circle with a shadowBlur bloom. Cheap and
 *  effective for bullets, pickups, and HUD accents. */
export function glowSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opts: { blur?: number; alpha?: number } = {},
) {
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = opts.blur ?? 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A shaded 3D-looking sphere (radial gradient, top-left light source). */
export function radialSphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opts: { rim?: string } = {},
) {
  const grad = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.4,
    radius * 0.08,
    x,
    y,
    radius,
  );
  grad.addColorStop(0, shade(color, 0.55));
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, shade(color, -0.45));
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (opts.rim) {
    ctx.strokeStyle = opts.rim;
    ctx.lineWidth = Math.max(1, radius * 0.08);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

/** Faint horizontal scanlines, applied as the last draw call. */
export function scanlineOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: { alpha?: number; spacing?: number } = {},
) {
  const alpha = opts.alpha ?? 0.07;
  const spacing = opts.spacing ?? 3;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += spacing) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

/** Darkened corners so the felt/base color reads as a cabinet frame. */
export function vignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: { strength?: number } = {},
) {
  const strength = opts.strength ?? 0.5;
  const grad = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.35,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.72,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Starfield (parallax)
// ---------------------------------------------------------------------------

export type StarLayer = { count: number; speed: number; size: number; alpha: number };

const DEFAULT_LAYERS: StarLayer[] = [
  { count: 26, speed: 10, size: 1, alpha: 0.3 },
  { count: 18, speed: 22, size: 1.5, alpha: 0.55 },
  { count: 10, speed: 40, size: 2, alpha: 0.9 },
];

type Star = { x: number; y: number; layer: number };

/** Depth-layered scrolling starfield. `update(dt, dir)` moves stars along a
 *  direction vector (default: downward), wrapping at the canvas edges. */
export class Starfield {
  private stars: Star[] = [];
  private layers: StarLayer[];
  private w: number;
  private h: number;

  constructor(w: number, h: number, layers: StarLayer[] = DEFAULT_LAYERS) {
    this.w = w;
    this.h = h;
    this.layers = layers;
    layers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({ x: Math.random() * w, y: Math.random() * h, layer: li });
      }
    });
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  update(dt: number, dir: { x: number; y: number } = { x: 0, y: 1 }) {
    for (const s of this.stars) {
      const layer = this.layers[s.layer];
      s.x += dir.x * layer.speed * dt;
      s.y += dir.y * layer.speed * dt;
      if (s.y > this.h) { s.y -= this.h; s.x = Math.random() * this.w; }
      if (s.y < 0) { s.y += this.h; s.x = Math.random() * this.w; }
      if (s.x > this.w) s.x -= this.w;
      if (s.x < 0) s.x += this.w;
    }
  }

  draw(ctx: CanvasRenderingContext2D, color = "#ffffff") {
    ctx.save();
    for (const s of this.stars) {
      const layer = this.layers[s.layer];
      ctx.globalAlpha = layer.alpha;
      ctx.fillStyle = color;
      ctx.fillRect(s.x, s.y, layer.size, layer.size);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Particles (pooled — zero per-burst allocation once warmed up)
// ---------------------------------------------------------------------------

type Particle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};

const DEFAULT_PARTICLE_CAP = 120;

export type BurstOptions = {
  count?: number;
  color?: string | string[];
  speed?: number;
  /** Center direction (radians); 0 = pointing along +x. */
  angle?: number;
  /** Cone width around `angle`, in radians. Default: full circle. */
  spread?: number;
  life?: number;
  size?: number;
  gravity?: number;
};

/** Fixed-size particle pool (default cap 120) for shake/burst juice without
 *  per-frame garbage. Inactive slots are reused, so bursts never allocate. */
export class Particles {
  private pool: Particle[];

  constructor(cap: number = DEFAULT_PARTICLE_CAP) {
    this.pool = Array.from({ length: cap }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: PALETTE.gold,
      gravity: 0,
    }));
  }

  burst(x: number, y: number, opts: BurstOptions = {}) {
    const count = opts.count ?? 12;
    const colors = Array.isArray(opts.color) ? opts.color : [opts.color ?? PALETTE.gold];
    const speed = opts.speed ?? 90;
    const baseAngle = opts.angle ?? 0;
    const spread = opts.spread ?? Math.PI * 2;
    const life = opts.life ?? 0.5;
    const size = opts.size ?? 2.5;
    const gravity = opts.gravity ?? 0;

    let spawned = 0;
    for (const p of this.pool) {
      if (spawned >= count) break;
      if (p.active) continue;
      const angle = baseAngle + (Math.random() * spread - spread / 2);
      const spd = speed * (0.5 + Math.random() * 0.5);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.life = life * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.size = size * (0.7 + Math.random() * 0.6);
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.gravity = gravity;
      spawned++;
    }
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  clear() {
    for (const p of this.pool) p.active = false;
  }
}

// ---------------------------------------------------------------------------
// Screen shake
// ---------------------------------------------------------------------------

/** Decaying screen-shake accumulator. Call `trigger()` on impacts,
 *  `update(dt)` once per frame, then translate the canvas by `.offset`
 *  before drawing (see `applyShake`). */
export class Shake {
  private amplitude = 0;
  private duration = 0;
  private elapsed = 0;
  private ox = 0;
  private oy = 0;

  trigger(amplitude: number, duration = 0.3) {
    // A bigger, fresher shake always wins over a smaller/older one in progress.
    if (amplitude >= this.amplitude || this.elapsed >= this.duration) {
      this.amplitude = amplitude;
      this.duration = duration;
      this.elapsed = 0;
    }
  }

  update(dt: number) {
    if (this.elapsed >= this.duration) {
      this.ox = 0;
      this.oy = 0;
      return;
    }
    this.elapsed += dt;
    const t = Math.max(0, 1 - this.elapsed / this.duration);
    const mag = this.amplitude * t;
    this.ox = (Math.random() * 2 - 1) * mag;
    this.oy = (Math.random() * 2 - 1) * mag;
  }

  get offset() {
    return { x: this.ox, y: this.oy };
  }

  get active() {
    return this.elapsed < this.duration;
  }
}

/** Convenience: translate the context by the current shake offset. Pair with
 *  ctx.save()/ctx.restore() around the whole draw pass. */
export function applyShake(ctx: CanvasRenderingContext2D, shake: Shake) {
  const { x, y } = shake.offset;
  if (x || y) ctx.translate(x, y);
}
