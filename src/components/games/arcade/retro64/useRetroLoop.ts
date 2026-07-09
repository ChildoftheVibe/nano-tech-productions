"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

export type RetroLoopCallback = (dt: number, elapsedMs: number) => void;

/**
 * A single requestAnimationFrame loop with delta-time in seconds, clamped so
 * a backgrounded/refocused tab never delivers a huge dt spike. Automatically
 * pauses when the document is hidden or `paused` is true (e.g. once a game
 * has settled win/lose) so finished games stop burning CPU/GPU, and exposes
 * `prefers-reduced-motion` so callers can skip shake/particle juice.
 */
export function useRetroLoop(
  callback: RetroLoopCallback,
  opts: { paused?: boolean } = {},
): { reducedMotion: boolean } {
  const reducedMotion = !!useReducedMotion();
  const callbackRef = useRef(callback);
  const pausedRef = useRef(!!opts.paused);

  // Keep the refs fresh without writing to them during render — this runs
  // after every commit instead.
  useEffect(() => {
    callbackRef.current = callback;
    pausedRef.current = !!opts.paused;
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hidden = document.hidden;

    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden) last = performance.now();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (hidden || pausedRef.current) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      callbackRef.current(dt, now);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { reducedMotion };
}
