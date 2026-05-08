"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { syncAudioCache, clearAudioCache } from "@/lib/audioCache";
import {
  trackPlayStart,
  trackPlayProgress,
  trackSkip,
  trackPlayComplete,
  trackPause,
  trackSeek,
} from "@/lib/analytics";
import type { Track } from "@/types/music";

type PlayerContextValue = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

const REFETCH_WHEN_REMAINING = 5;
const PROGRESS_TICK_SECONDS = 10;

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

  // Track-level analytics state (refs so they don't trigger renders).
  const lastTrackIdRef = useRef<string | null>(null);
  const lastReportedProgressRef = useRef<number>(-1);
  const completedRef = useRef(false);
  const playFiredRef = useRef(false);
  const pauseAtRef = useRef<number>(0);
  const seekFromRef = useRef<number | null>(null);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const seekRequestId = usePlayerStore((s) => s.seekRequestId);
  const queue = usePlayerStore((s) => s.queue);
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Track changed → fire skip-if-incomplete on the previous track,
    // then reset progress trackers for the new track.
    const previousTrackId = lastTrackIdRef.current;
    if (previousTrackId && previousTrackId !== (currentTrack?.id ?? null)) {
      const prev = queue.find((t) => t.id === previousTrackId);
      const dur = audio.duration;
      const at = audio.currentTime;
      if (prev && !completedRef.current && Number.isFinite(dur) && dur > 0 && at < dur - 0.5) {
        trackSkip(prev, at, dur);
      }
    }

    lastTrackIdRef.current = currentTrack?.id ?? null;
    lastReportedProgressRef.current = -1;
    completedRef.current = false;
    playFiredRef.current = false;

    if (currentTrack?.audioUrl) {
      if (audio.src !== currentTrack.audioUrl) {
        audio.src = currentTrack.audioUrl;
        audio.load();
      }
    } else {
      audio.removeAttribute("src");
      audio.load();
    }
  }, [currentTrack, queue]);

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

  // Fire play_start once per track-play activation.
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    if (playFiredRef.current) return;
    playFiredRef.current = true;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    trackPlayStart(currentTrack, currentAlbum, idx >= 0 ? idx : 0);
  }, [isPlaying, currentTrack, currentAlbum, queue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  // Seek tracking: when the store bumps seekRequestId, capture from→to.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekRequestId === 0) return;
    const target = usePlayerStore.getState().currentTime;
    const from = audio.currentTime;
    if (Number.isFinite(target)) {
      seekFromRef.current = from;
      audio.currentTime = target;
      if (currentTrack) trackSeek(currentTrack, from, target);
    }
  }, [seekRequestId, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      const t = audio.currentTime;
      const d = audio.duration;
      usePlayerStore.getState().setCurrentTime(t);
      if (!currentTrack || !Number.isFinite(d) || d <= 0) return;

      // Fire progress every PROGRESS_TICK_SECONDS only.
      const bucket = Math.floor(t / PROGRESS_TICK_SECONDS);
      if (bucket > lastReportedProgressRef.current) {
        lastReportedProgressRef.current = bucket;
        if (bucket > 0) trackPlayProgress(currentTrack, t, d);
      }
    };

    const onDuration = () =>
      usePlayerStore
        .getState()
        .setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);

    const onEnded = () => {
      if (currentTrack && Number.isFinite(audio.duration)) {
        completedRef.current = true;
        trackPlayComplete(currentTrack, audio.duration);
      }
      usePlayerStore.getState().nextTrack();
    };

    const onPause = () => {
      // Browser fires "pause" on natural end too; don't double-count.
      if (audio.ended) return;
      pauseAtRef.current = audio.currentTime;
      if (currentTrack) trackPause(currentTrack, audio.currentTime);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      clearAudioCache();
    };
  }, [currentTrack]);

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
