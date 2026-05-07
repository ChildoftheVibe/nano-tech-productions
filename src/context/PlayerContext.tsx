"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { supabase } from "@/lib/supabase";
import type { Track } from "@/data/catalog";

type PlayerContextValue = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

type SupabaseTrackRow = {
  id: string;
  album_id: string | null;
  title: string;
  track_number: number | null;
  duration: string | null;
  price: number | string;
  audio_url: string | null;
  features: string[] | null;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const seekRequestId = usePlayerStore((s) => s.seekRequestId);

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
    };
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("id, album_id, title, track_number, duration, price, audio_url, features")
        .eq("is_published", true)
        .not("audio_url", "is", null);
      if (cancelled || error || !data) return;
      const tracks: Track[] = (data as SupabaseTrackRow[])
        .filter((row) => !!row.audio_url)
        .map((row) => ({
          id: row.id,
          albumId: row.album_id ?? "",
          title: row.title,
          trackNumber: row.track_number ?? 0,
          duration: row.duration ?? "0:00",
          price: Number(row.price),
          features: row.features ?? undefined,
          audioUrl: row.audio_url ?? undefined,
        }));
      if (!tracks.length) return;
      const store = usePlayerStore.getState();
      if (store.queue.length > 0 || store.currentTrack) return;
      store.setQueue(shuffle(tracks));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
