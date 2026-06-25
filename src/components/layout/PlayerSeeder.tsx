"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { usePlayerStore } from "@/store/playerStore";
import type { Album, Track } from "@/types/music";

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Seeds the player queue synchronously on mount using tracks pre-fetched
 * server-side. Rendered inside PlayerProvider so it can access audioRef.
 * Returns null — no UI output.
 *
 * The server-side fetch (in layout.tsx) eliminates the client-side
 * GET /api/playlist round-trip that was the previous seeding mechanism.
 * This means the queue is ready the moment React hydrates, with no async
 * wait and no failure mode from a missing or slow API response.
 */
export function PlayerSeeder({ tracks }: { tracks: Track[] }) {
  const { audioRef } = usePlayer();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    const store = usePlayerStore.getState();
    if (store.queue.length > 0 || store.currentTrack) return;

    const playable = tracks.filter((t) => !!t.audioUrl);
    if (!playable.length) return;

    const shuffled = shuffle(playable);
    const firstWithCover =
      shuffled.find((t) => !!(t.albumId && t.albumCoverImage)) ?? null;
    const first = firstWithCover ?? shuffled[0] ?? null;
    const reordered =
      first && first !== shuffled[0]
        ? [first, ...shuffled.filter((t) => t.id !== first.id)]
        : shuffled;

    const seedAlbum: Album | null =
      first?.albumId && first.albumCoverImage
        ? {
            id: first.albumId,
            slug: first.albumSlug ?? "",
            title: first.albumTitle ?? "",
            description: "",
            releaseDate: "",
            coverImage: first.albumCoverImage,
            bgColor: first.albumBgColor ?? "#090f0e",
            accentColor: first.albumAccentColor ?? "#62f3e4",
            spotifyUrl: "",
            tracks: [],
          }
        : null;

    store.setQueue(reordered, first, seedAlbum);

    // Set audio.src in the same synchronous block so there is no window
    // between store update and src assignment where a play() call would
    // throw "The element has no supported sources".
    const audio = audioRef.current;
    if (audio && first?.audioUrl) {
      audio.src = first.audioUrl;
      audio.load();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
