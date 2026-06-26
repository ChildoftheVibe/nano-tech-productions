"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { usePlayerStore } from "@/store/playerStore";
import { buildSeed } from "@/lib/playlistSeed";
import type { Track } from "@/types/music";

/**
 * Seeds the player queue synchronously on mount using tracks pre-fetched
 * server-side. Rendered inside PlayerProvider so it can access audioRef.
 * Returns null — no UI output.
 *
 * The server-side fetch (in layout.tsx) eliminates the client-side
 * GET /api/playlist round-trip that was the previous seeding mechanism.
 * This means the queue is ready the moment React hydrates, with no async
 * wait and no failure mode from a missing or slow API response.
 *
 * If the server-side prefetch came back empty (a failed or slow
 * getPlaylistTracks()), we fall back to ensureQueueSeeded() — a client-side
 * /api/playlist fetch — so the queue still fills rather than staying empty for
 * the whole session.
 */
export function PlayerSeeder({
  tracks,
  isAdminCurated = false,
}: {
  tracks: Track[];
  isAdminCurated?: boolean;
}) {
  const { audioRef, ensureQueueSeeded, primePlayback } = usePlayer();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    const store = usePlayerStore.getState();
    if (store.queue.length > 0 || store.currentTrack) return;

    const { queue, first, album } = buildSeed(tracks, { ordered: isAdminCurated });

    // Empty/failed server prefetch — recover with a client-side fetch and
    // start playback (autoplay or on first gesture).
    if (!first) {
      void ensureQueueSeeded(true);
      return;
    }

    store.setQueue(queue, first, album);

    // Set audio.src in the same synchronous block so there is no window
    // between store update and src assignment where a play() call would
    // throw "The element has no supported sources".
    const audio = audioRef.current;
    if (audio && first.audioUrl) {
      audio.src = first.audioUrl;
      audio.load();
    }

    // Start the music. primePlayback attempts autoplay immediately and, if the
    // browser blocks it, arms a one-time gesture listener — so playback begins
    // for every visitor (including returning ones, where the tap banner is
    // suppressed) rather than requiring a manual play press.
    primePlayback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
