"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";

const STORAGE_KEY = "ntv_audio_unlocked";
const BANNER_DELAY_MS = 2000;

// External-store snapshot for the unlock state. useSyncExternalStore avoids
// the React 19 set-state-in-effect lint rule while still keeping the server-
// side snapshot consistent (always "unlocked" on the server so we render
// nothing during SSR).
let cachedUnlocked: boolean | null = null;
const unlockListeners = new Set<() => void>();

function readUnlocked(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function getUnlockedSnapshot(): boolean {
  if (cachedUnlocked === null) cachedUnlocked = readUnlocked();
  return cachedUnlocked;
}

function getServerUnlockedSnapshot(): boolean {
  return true;
}

function subscribeUnlocked(cb: () => void): () => void {
  unlockListeners.add(cb);
  return () => unlockListeners.delete(cb);
}

function markUnlocked() {
  try {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* quota — fine */
  }
  cachedUnlocked = true;
  for (const cb of unlockListeners) cb();
}

/**
 * Shows a one-time hint on first visit telling the user audio is gated behind
 * a tap. Browsers' autoplay policy blocks the very first audio.play() from a
 * non-gesture context — once any audio element has played-or-attempted under
 * a real user gesture, subsequent programmatic plays succeed on that element.
 *
 * The banner only fades in if no interaction has happened by BANNER_DELAY_MS,
 * and we set the localStorage flag on the first real click anywhere so it
 * never appears again.
 */
export function TapToStartBanner() {
  const { audioRef } = usePlayer();
  const unlocked = useSyncExternalStore(
    subscribeUnlocked,
    getUnlockedSnapshot,
    getServerUnlockedSnapshot,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (unlocked) return;

    const dismiss = () => {
      // Best-effort prime — if a src is set this kicks off playback; if not,
      // the call is a no-op but the element is now unlocked for future
      // programmatic plays.
      const audio = audioRef.current;
      if (audio) {
        const r = audio.play();
        if (r && typeof r.catch === "function") r.catch(() => {});
      }
      markUnlocked();
    };

    const timer = window.setTimeout(() => setVisible(true), BANNER_DELAY_MS);
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [unlocked, audioRef]);

  if (unlocked) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="tap-to-start"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pointer-events-none fixed inset-x-0 bottom-[88px] z-40 flex justify-center px-4 md:bottom-[100px]"
          aria-live="polite"
        >
          <div
            className="rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#3DD6C8] backdrop-blur"
            style={{
              borderColor: "rgba(61, 214, 200, 0.4)",
              background: "rgba(0,0,0,0.55)",
              boxShadow: "0 0 18px rgba(61, 214, 200, 0.25)",
            }}
          >
            Tap anywhere to start the music
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
