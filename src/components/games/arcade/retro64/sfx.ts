"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Asset-free chiptune SFX for the arcade games: short square/triangle
 * oscillator blips with a fast gain envelope, synthesized on the fly via
 * Web Audio (no audio files, no network requests, zero bundle weight).
 *
 * The AudioContext is created lazily on the first user gesture anywhere in
 * the document (browsers block autoplay before that), and the mute
 * preference is persisted to localStorage and shared across every mounted
 * game via a tiny module-level pub/sub.
 */

export type SfxName =
  | "shoot"
  | "hit"
  | "explode"
  | "jump"
  | "land"
  | "coin"
  | "place"
  | "clear"
  | "win"
  | "lose";

const MUTE_KEY = "ntv-arcade-sfx-muted";

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(v: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {
    // Storage unavailable (private mode, etc.) — mute preference just won't persist.
  }
}

let mutedFlag = readMuted();
const listeners = new Set<(muted: boolean) => void>();

function setMuted(v: boolean) {
  mutedFlag = v;
  writeMuted(v);
  listeners.forEach((l) => l(v));
}

let ctx: AudioContext | null = null;
let gestureUnlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** One oscillator "blip": ramps frequency (optional) under a fast attack /
 *  exponential-decay gain envelope, then stops itself. */
function blip(
  ac: AudioContext,
  opts: { type: OscillatorType; freq: number; freqEnd?: number; dur: number; gain?: number; delay?: number },
) {
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const osc = ac.createOscillator();
  const gainNode = ac.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(Math.max(1, opts.freq), t0);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + opts.dur);
  }
  const peak = opts.gain ?? 0.12;
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(gainNode).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.02);
}

const RECIPES: Record<SfxName, (ac: AudioContext) => void> = {
  shoot: (ac) => blip(ac, { type: "square", freq: 880, freqEnd: 220, dur: 0.09, gain: 0.08 }),
  hit: (ac) => blip(ac, { type: "square", freq: 220, freqEnd: 80, dur: 0.07, gain: 0.11 }),
  explode: (ac) => {
    blip(ac, { type: "triangle", freq: 140, freqEnd: 36, dur: 0.28, gain: 0.16 });
    blip(ac, { type: "square", freq: 90, freqEnd: 28, dur: 0.22, gain: 0.09, delay: 0.02 });
  },
  jump: (ac) => blip(ac, { type: "square", freq: 300, freqEnd: 620, dur: 0.11, gain: 0.09 }),
  land: (ac) => blip(ac, { type: "triangle", freq: 160, freqEnd: 70, dur: 0.08, gain: 0.11 }),
  coin: (ac) => {
    blip(ac, { type: "square", freq: 988, dur: 0.06, gain: 0.09 });
    blip(ac, { type: "square", freq: 1319, dur: 0.12, gain: 0.09, delay: 0.06 });
  },
  place: (ac) => blip(ac, { type: "triangle", freq: 440, dur: 0.05, gain: 0.07 }),
  clear: (ac) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      blip(ac, { type: "square", freq: f, dur: 0.1, gain: 0.09, delay: i * 0.05 }),
    );
  },
  win: (ac) => {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      blip(ac, { type: "triangle", freq: f, dur: 0.14, gain: 0.11, delay: i * 0.09 }),
    );
  },
  lose: (ac) => {
    [392, 349, 293, 220].forEach((f, i) =>
      blip(ac, { type: "square", freq: f, dur: 0.16, gain: 0.09, delay: i * 0.09 }),
    );
  },
};

function playSfx(name: SfxName) {
  if (mutedFlag) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  RECIPES[name](ac);
}

/** Mute toggle + SFX trigger, shared across every mounted game. */
export function useSfx() {
  const [muted, setMutedState] = useState(mutedFlag);

  useEffect(() => {
    listeners.add(setMutedState);
    return () => {
      listeners.delete(setMutedState);
    };
  }, []);

  // Unlock the AudioContext on the first user gesture (autoplay policy).
  useEffect(() => {
    if (gestureUnlocked) return;
    const unlock = () => {
      gestureUnlocked = true;
      const ac = getCtx();
      if (ac && ac.state === "suspended") void ac.resume();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback((name: SfxName) => playSfx(name), []);
  const toggleMuted = useCallback(() => setMuted(!mutedFlag), []);

  return { play, muted, toggleMuted };
}
