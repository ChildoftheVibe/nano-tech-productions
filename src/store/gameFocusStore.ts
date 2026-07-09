"use client";

import { useEffect } from "react";
import { create } from "zustand";

/**
 * Tracks whether a playable game surface is currently mounted, so global
 * media-player keyboard shortcuts (Space, arrows, M in PlayerBar) don't hijack
 * the same keys the arcade games use for movement, and don't pause/seek the
 * music mid-round. Uses a mount counter so overlapping surfaces (e.g. the
 * portal gate over the chamber) stay locked until the last one unmounts.
 */
type GameFocusState = {
  count: number;
  enter: () => void;
  exit: () => void;
};

export const useGameFocusStore = create<GameFocusState>((set) => ({
  count: 0,
  enter: () => set((s) => ({ count: s.count + 1 })),
  exit: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));

/** True while any game surface holds keyboard focus. Read outside React. */
export const isGameFocused = () => useGameFocusStore.getState().count > 0;

/**
 * Claim the keyboard for a game while `active` is true. Increments the focus
 * counter on mount / when active turns true, and releases it on unmount.
 */
export function useGameKeyboardLock(active = true): void {
  const enter = useGameFocusStore((s) => s.enter);
  const exit = useGameFocusStore((s) => s.exit);
  useEffect(() => {
    if (!active) return;
    enter();
    return exit;
  }, [active, enter, exit]);
}
