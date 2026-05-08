"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { syncAudioCache, clearAudioCache } from "@/lib/audioCache";
import type { Track } from "@/types/music";

type PlayerContextValue = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

const REFETCH_WHEN_REMAINING = 5;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

async function fetchPlaylist(): Promise<Track[]> {
  try {
    const res = await fetch("/api/playlist", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { tracks?: Track[] };
    return json.tracks ?? [];
  } catch {
    return [];
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const refetchingRef = useRef(false);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const seekRequestId = usePlayerStore((s) => s.seekRequestId);
  const queue = usePlayerStore((s) => s.queue);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentTrack?.audioUrl) {
      if (audio.src !== currentTrack.audioUrl) {
        audio.src = currentTrack.audioUrl;
        audio.load();
      }
    } else {
      audio.removeAttribute("src");
      audio.load();
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying && currentTrack?.audioUrl) {
      audio.play().catch(() => {
        usePlayerStore.getState().setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekRequestId === 0) return;
    const target = usePlayerStore.getState().currentTime;
    if (Number.isFinite(target)) audio.currentTime = target;
  }, [seekRequestId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => usePlayerStore.getState().setCurrentTime(audio.currentTime);
    const onDuration = () =>
      usePlayerStore.getState().setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => usePlayerStore.getState().nextTrack();
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
      clearAudioCache();
    };
  }, []);

  // Initial playlist seed: only fetch if queue is empty and nothing is playing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const store = usePlayerStore.getState();
      if (store.queue.length > 0 || store.currentTrack) return;
      const tracks = await fetchPlaylist();
      if (cancelled || !tracks.length) return;
      const fresh = usePlayerStore.getState();
      if (fresh.queue.length > 0 || fresh.currentTrack) return;
      fresh.setQueue(shuffle(tracks));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preload the next 2 tracks and evict tracks 3+ positions behind the cursor.
  useEffect(() => {
    if (!currentTrack) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    syncAudioCache(queue, idx);
  }, [currentTrack, queue]);

  // When the queue is running low, fetch another 500 random tracks and append.
  useEffect(() => {
    if (!currentTrack) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    if (idx < 0) return;
    const remaining = queue.length - 1 - idx;
    if (remaining > REFETCH_WHEN_REMAINING) return;
    if (refetchingRef.current) return;
    refetchingRef.current = true;
    (async () => {
      try {
        const fresh = await fetchPlaylist();
        if (!fresh.length) return;
        const known = new Set(usePlayerStore.getState().queue.map((t) => t.id));
        const additions = shuffle(fresh).filter((t) => !known.has(t.id));
        if (!additions.length) return;
        const store = usePlayerStore.getState();
        store.setQueue([...store.queue, ...additions]);
      } finally {
        refetchingRef.current = false;
      }
    })();
  }, [currentTrack, queue]);

  return (
    <PlayerContext.Provider value={{ audioRef }}>
      {children}
      <audio ref={audioRef} preload="metadata" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
