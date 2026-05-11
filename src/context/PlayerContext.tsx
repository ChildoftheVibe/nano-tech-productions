"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
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
import type { Album, Track } from "@/types/music";

type PlayerContextValue = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Toggle play/pause for the current track. Call directly from click
   *  handlers — runs audio.play()/pause() synchronously to preserve the
   *  user-gesture chain (browser autoplay policy). */
  togglePlayPause: () => void;
  /** Start playback of a specific track. Use from click handlers. */
  playFromTrack: (track: Track, album?: Album | null) => void;
  /** Start playback of an album from its first ordered track. */
  playFromAlbum: (album: Album) => void;
  /** Next track + play directly. */
  nextAndPlay: () => void;
  /** Previous track + play directly. */
  previousAndPlay: () => void;
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
        console.log(
          "[PlayerContext] setting audio.src for",
          currentTrack.title,
          "→",
          currentTrack.audioUrl,
        );
        audio.src = currentTrack.audioUrl;
        audio.load();
      }
    } else {
      if (currentTrack) {
        console.warn(
          "[PlayerContext] currentTrack has no audioUrl:",
          currentTrack.title,
          currentTrack.id,
        );
      }
      audio.removeAttribute("src");
      audio.load();
    }
  }, [currentTrack, queue]);

  // NOTE: There is intentionally no effect that calls audio.play() when
  // isPlaying flips true. Programmatic play() invoked from a useEffect runs
  // outside the user-gesture chain — Chrome routinely blocks it under its
  // autoplay policy. Instead, every play-initiating click handler calls
  // audio.play() directly via one of the helpers exposed below
  // (togglePlayPause / playFromTrack / playFromAlbum / next|previousAndPlay).
  //
  // We DO still react to isPlaying going false (pause is always allowed): a
  // separate effect handles that so external pause triggers still work.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

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
      const store = usePlayerStore.getState();
      store.nextTrack();
      // Auto-advance: the audio element is already "unlocked" because it just
      // finished playing, so a programmatic play() succeeds without a fresh
      // user gesture. We do it here directly because we removed the
      // isPlaying→play effect.
      const next = usePlayerStore.getState().currentTrack;
      if (next?.audioUrl) {
        if (audio.src !== next.audioUrl) {
          audio.src = next.audioUrl;
          audio.load();
        }
        audio.play().catch((err) => {
          console.warn("[PlayerContext] auto-advance play() rejected:", err);
          store.setPlaying(false);
        });
      }
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
      console.log(
        "[PlayerContext] seed: fetched",
        tracks.length,
        "playable tracks from /api/playlist",
      );
      if (cancelled || !tracks.length) return;
      const fresh = usePlayerStore.getState();
      if (fresh.queue.length > 0 || fresh.currentTrack) return;
      const shuffled = shuffle(tracks);
      // Without a currentTrack the PlayerBar play button stays disabled
      // (disabled={!currentTrack}) — clicks do nothing, which presents as
      // "the play button doesn't work". Seed the first track too so the
      // user can press play without first picking an album.
      fresh.setQueue(shuffled, shuffled[0] ?? null);
      console.log(
        "[PlayerContext] seed: queue set, currentTrack =",
        shuffled[0]?.title,
        "audioUrl =",
        shuffled[0]?.audioUrl,
      );
      // Set audio.src directly in the same synchronous block. Relying on the
      // [currentTrack, queue] effect that runs after the next commit leaves a
      // window where the user can tap play before src lands — on prod that
      // produces "The element has no supported sources." Setting src here
      // closes that window: by the time the React commit + src-effect fire,
      // src is already the same value and the effect is a no-op.
      const audio = audioRef.current;
      const first = shuffled[0];
      if (audio && first?.audioUrl) {
        console.log(
          "[PlayerContext] seed: setting audio.src synchronously →",
          first.audioUrl,
        );
        audio.src = first.audioUrl;
        audio.load();
      }
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

  // ─────────────────────────────────────────────────────────────────────
  // Synchronous play helpers. Every play-initiating click handler in the app
  // calls one of these; they invoke audio.play() directly so the user-gesture
  // token from the click is still active. Going via useState→useEffect (the
  // pattern we used to have) drops the gesture and triggers Chrome's autoplay
  // block.
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Ensure the audio element has the right src for `track` and is loaded.
   * Defensive: when an <audio> has no src assigned, `audio.src` reads back as
   * the empty string in most browsers, but some report the page URL (the
   * resolved value of an empty href attribute). Either case means "no media
   * loaded" and `play()` will throw "The element has no supported sources".
   * Treat both as needing a fresh assignment.
   */
  const ensureSrc = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio || !track.audioUrl) return null;
    const current = audio.src;
    const blank =
      !current ||
      current === "" ||
      (typeof window !== "undefined" && current === window.location.href);
    if (blank || current !== track.audioUrl) {
      console.log(
        "[PlayerContext] ensureSrc → setting audio.src:",
        track.audioUrl,
        "(was:",
        current || "(empty)",
        ")",
      );
      audio.src = track.audioUrl;
      audio.load();
    }
    return audio;
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    const store = usePlayerStore.getState();
    if (!audio) return;
    if (store.isPlaying) {
      audio.pause();
      store.setPlaying(false);
      return;
    }
    const track = store.currentTrack;
    if (!track?.audioUrl) return;
    // Guarantee src is set before calling play(). Without this guard, prod
    // hits "The element has no supported sources" when the user taps play
    // before React has run the src-setting effect on initial seed.
    ensureSrc(track);
    console.log("[PlayerContext] togglePlayPause src before play:", audio.src);
    audio.play().catch((err) => {
      console.warn("[PlayerContext] togglePlayPause play() rejected:", err);
      store.setPlaying(false);
    });
    store.setPlaying(true);
  }, [ensureSrc]);

  const playFromTrack = useCallback(
    (track: Track, album: Album | null = null) => {
      const store = usePlayerStore.getState();
      store.playTrack(track, album);
      // playTrack sets isPlaying=true in state; sync the actual audio element
      // synchronously so the user-gesture token still grants permission.
      const audio = ensureSrc(track);
      if (audio) {
        audio.play().catch((err) => {
          console.warn("[PlayerContext] playFromTrack play() rejected:", err);
          store.setPlaying(false);
        });
      }
    },
    [ensureSrc],
  );

  const playFromAlbum = useCallback(
    (album: Album) => {
      const store = usePlayerStore.getState();
      store.playAlbum(album);
      const first = usePlayerStore.getState().currentTrack;
      if (!first) return;
      const audio = ensureSrc(first);
      console.log("[PlayerContext] playFromAlbum src before play:", audio?.src);
      if (audio) {
        audio.play().catch((err) => {
          console.warn("[PlayerContext] playFromAlbum play() rejected:", err);
          store.setPlaying(false);
        });
      }
    },
    [ensureSrc],
  );

  const nextAndPlay = useCallback(() => {
    const store = usePlayerStore.getState();
    store.nextTrack();
    const next = usePlayerStore.getState().currentTrack;
    if (!next) return;
    const audio = ensureSrc(next);
    console.log("[PlayerContext] nextAndPlay src before play:", audio?.src);
    if (audio) {
      audio.play().catch((err) => {
        console.warn("[PlayerContext] nextAndPlay play() rejected:", err);
        store.setPlaying(false);
      });
    }
  }, [ensureSrc]);

  const previousAndPlay = useCallback(() => {
    const store = usePlayerStore.getState();
    store.previousTrack();
    const prev = usePlayerStore.getState().currentTrack;
    if (!prev) return;
    const audio = ensureSrc(prev);
    console.log("[PlayerContext] previousAndPlay src before play:", audio?.src);
    if (audio) {
      audio.play().catch((err) => {
        console.warn("[PlayerContext] previousAndPlay play() rejected:", err);
        store.setPlaying(false);
      });
    }
  }, [ensureSrc]);

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        togglePlayPause,
        playFromTrack,
        playFromAlbum,
        nextAndPlay,
        previousAndPlay,
      }}
    >
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
