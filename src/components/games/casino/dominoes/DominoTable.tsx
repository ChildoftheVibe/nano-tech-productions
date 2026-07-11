"use client";

import { useEffect, useRef } from "react";
import type { Domino } from "@/lib/casino/dominoes";

/** Vector-drawn neon domino table, rendered on a PixiJS canvas.
 *
 *  The reference tile art (`Nomino Upgrade/Dominoe Upgrade/dominoes-*.webp`)
 *  ships as two flat sprite sheets with no frame-coordinate atlas JSON, and
 *  the pip identity of each baked tile is still unverified (the pack's own
 *  README flags this as a pending manual pass). Rather than guess pip values
 *  from a raster crop for a game that pays real Nano Bucks, tiles are drawn
 *  procedurally here — same neon-teal/black look as the reference art, but
 *  the pips are always exactly what the engine says they are. */

export type TileVisual = {
  domino: Domino;
  faceDown?: boolean;
  glow?: boolean;
  dim?: boolean;
};

type Props = {
  hand: TileVisual[];
  community: TileVisual | null;
  reducedMotion: boolean;
  onTileClick?: (index: number) => void;
};

const TILE_W = 96;
const TILE_H = 52;
const RADIUS = 10;
const INK = 0x070c0b;
const TEAL = 0x62f3e4;
const TEAL_DIM = 0x2c4644;
const BORDER = 0x1c2e2c;

function pipLayout(n: number): [number, number][] {
  const c = 0;
  const q = 0.62;
  switch (n) {
    case 0:
      return [];
    case 1:
      return [[c, c]];
    case 2:
      return [
        [-q, -q],
        [q, q],
      ];
    case 3:
      return [
        [-q, -q],
        [c, c],
        [q, q],
      ];
    case 4:
      return [
        [-q, -q],
        [q, -q],
        [-q, q],
        [q, q],
      ];
    case 5:
      return [
        [-q, -q],
        [q, -q],
        [c, c],
        [-q, q],
        [q, q],
      ];
    case 6:
      return [
        [-q, -q],
        [q, -q],
        [-q, c],
        [q, c],
        [-q, q],
        [q, q],
      ];
    default:
      return [];
  }
}

/** PixiJS is dynamically imported so its ~120KB never lands in the initial
 *  bundle — only when a player opens Casino Dominoes. */
export function DominoTable({ hand, community, reducedMotion, onTileClick }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<import("pixi.js").Application | null>(null);
  const rootRef = useRef<import("pixi.js").Container | null>(null);
  const clickRef = useRef(onTileClick);
  useEffect(() => {
    clickRef.current = onTileClick;
  }, [onTileClick]);

  useEffect(() => {
    let cancelled = false;
    let ticked: ((delta: import("pixi.js").Ticker) => void) | null = null;

    (async () => {
      const PIXI = await import("pixi.js");
      if (cancelled || !hostRef.current) return;

      const app = new PIXI.Application();
      await app.init({
        background: "#0d1a17",
        backgroundAlpha: 0,
        resizeTo: hostRef.current,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }
      hostRef.current.appendChild(app.canvas);
      appRef.current = app;

      const root = new PIXI.Container();
      app.stage.addChild(root);
      rootRef.current = root;

      let t = 0;
      ticked = () => {
        t += app.ticker.deltaMS / 1000;
        for (const child of root.children) {
          const glowPulse = (child as { __glow?: boolean }).__glow;
          if (glowPulse && !reducedMotion) {
            child.alpha = 0.82 + Math.sin(t * 4) * 0.18;
          }
        }
      };
      app.ticker.add(ticked);
    })();

    return () => {
      cancelled = true;
      if (ticked && appRef.current) appRef.current.ticker.remove(ticked);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      rootRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const PIXI = await import("pixi.js");
      if (cancelled) return;
      const root = rootRef.current;
      const app = appRef.current;
      if (!root || !app) return;

      root.removeChildren().forEach((c) => c.destroy({ children: true }));

      const w = app.screen.width;
      const communityY = 56;
      const handY = communityY + TILE_H + 64;

      const drawTile = (
        tile: TileVisual,
        x: number,
        y: number,
        index: number | null,
      ) => {
        const c = new PIXI.Container();
        c.x = x;
        c.y = y;
        (c as unknown as { __glow?: boolean }).__glow = !!tile.glow;

        const shadow = new PIXI.Graphics();
        shadow.roundRect(-TILE_W / 2 + 3, -TILE_H / 2 + 5, TILE_W, TILE_H, RADIUS);
        shadow.fill({ color: 0x000000, alpha: 0.35 });
        c.addChild(shadow);

        const body = new PIXI.Graphics();
        const dim = !!tile.dim;
        body.roundRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, RADIUS);
        body.fill({ color: INK, alpha: dim ? 0.55 : 1 });
        body.stroke({ width: 2, color: dim ? BORDER : TEAL, alpha: dim ? 0.5 : 0.85 });
        c.addChild(body);

        if (tile.faceDown) {
          const glyph = new PIXI.Text({
            text: "V",
            style: {
              fill: TEAL,
              fontFamily: "sans-serif",
              fontSize: 20,
              fontWeight: "700",
            },
          });
          glyph.anchor.set(0.5);
          c.addChild(glyph);
        } else {
          const divider = new PIXI.Graphics();
          divider.moveTo(0, -TILE_H / 2 + 6).lineTo(0, TILE_H / 2 - 6);
          divider.stroke({ width: 2, color: dim ? BORDER : TEAL, alpha: dim ? 0.5 : 0.7 });
          c.addChild(divider);

          const pipColor = dim ? TEAL_DIM : TEAL;
          const drawHalf = (n: number, sign: -1 | 1) => {
            const halfW = TILE_W / 2 - 10;
            const halfH = TILE_H / 2 - 8;
            for (const [px, py] of pipLayout(n)) {
              const dot = new PIXI.Graphics();
              dot.circle(sign * (TILE_W / 4 + 4) + px * halfW * 0.55, py * halfH, 3.6);
              dot.fill({ color: pipColor, alpha: dim ? 0.6 : 1 });
              c.addChild(dot);
            }
          };
          drawHalf(tile.domino.a, -1);
          drawHalf(tile.domino.b, 1);
        }

        if (index !== null) {
          c.eventMode = "static";
          c.cursor = "pointer";
          c.on("pointertap", () => clickRef.current?.(index));
        }

        root.addChild(c);
        return c;
      };

      if (community) {
        drawTile(community, w / 2, communityY + TILE_H / 2, null);
      } else {
        const placeholder = new PIXI.Graphics();
        placeholder.roundRect(w / 2 - TILE_W / 2, communityY, TILE_W, TILE_H, RADIUS);
        placeholder.stroke({ width: 1.5, color: BORDER, alpha: 0.8 });
        root.addChild(placeholder);
      }

      const gap = 14;
      const total = hand.length * TILE_W + Math.max(0, hand.length - 1) * gap;
      const startX = w / 2 - total / 2 + TILE_W / 2;
      hand.forEach((tile, i) => {
        drawTile(tile, startX + i * (TILE_W + gap), handY, onTileClick ? i : null);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [hand, community, onTileClick]);

  return (
    <div
      ref={hostRef}
      className="h-[220px] w-full max-w-xl"
      role="img"
      aria-label={
        community
          ? `Community tile ${community.domino.a} ${community.domino.b}`
          : "Waiting to deal"
      }
    />
  );
}
