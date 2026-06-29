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
import { buildSeed } from "@/lib/playlistSeed";
import * as Sentry from '@sentry/nextjs'

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
  /** Guarantee the queue is populated, fetching `/api/playlist` if it's empty.
   *  Pass `autoplay` to begin playback once a track is loaded (used when the
   *  full-screen player opens onto an empty queue). Safe to call repeatedly. */
  ensureQueueSeeded: (autoplay?: boolean) => Promise<void>;
  /** Fetch an album by slug (if its tracks aren't loaded) then play it. */
  playAlbumBySlug: (slug: string) => Promise<void>;
  /** Attempt to start playback of the current track immediately. If the browser
   *  blocks autoplay (no prior gesture / low media engagement), arm one-time
   *  global gesture listeners that start playback on the user's first
   *  interaction. Runs for every visitor — the one load-time auto-start path. */
  primePlayback: () => void;
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

async function fetchPlaylist(): Promise<{ tracks: Track[]; isAdminCurated: boolean }> {
  try {
    const res = await fetch("/api/playlist", { cache: "no-store" });
    if (!res.ok) return { tracks: [], isAdminCurated: false };
    const json = (await res.json()) as { tracks?: Track[]; isAdminCurated?: boolean };
    return { tracks: json.tracks ?? [], isAdminCurated: json.isAdminCurated ?? false };
  } catch {
    return { tracks: [], isAdminCurated: false };
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const refetchingRef = useRef(false);
  const seedingRef = useRef(false);
  const primedRef = useRef(false);
  const preloadAbortRef = useRef<AbortController | null>(null)
  const hasPlayedRef = useRef<boolean>(false)

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
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setConnectionStatus = usePlayerStore((s) => s.setConnectionStatus);
  const resetConnectionState = usePlayerStore((s) => s.resetConnectionState);

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
    } else if (currentTrack) {
      // currentTrack exists but lacks an audioUrl — usually because an album
      // track had neither public_audio_id nor audio_url set. Previously this
      // branch called removeAttribute("src") + load(), which wiped the
      // previously-loaded track's src and broke playback ("The element has
      // no supported sources" on the next play()). Leave src intact so the
      // last working track stays playable; a deliberate switch to a real
      // audioUrl will replace it via the branch above.
      console.warn(
        "[PlayerContext] currentTrack has no audioUrl, leaving previous src loaded:",
        currentTrack.title,
        currentTrack.id,
        "(audio.src =",
        audio.src || "(empty)",
        ")",
      );
    }
    // Initial state (currentTrack === null): src is empty anyway and nothing
    // to do. Don't clear it here — the only sources of "src goes empty" are
    // either initial mount or this effect, and clearing in the latter case
    // is what caused the bug.
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
      const previous = currentTrack;
      if (previous && Number.isFinite(audio.duration)) {
        completedRef.current = true;
        trackPlayComplete(previous, audio.duration);
      }
      const store = usePlayerStore.getState();
      store.nextTrack();
      // Auto-advance: the audio element is already "unlocked" because it just
      // finished playing, so a programmatic play() succeeds without a fresh
      // user gesture. nextTrack now skips non-playable tracks; if it didn't
      // advance (no playable in queue) currentTrack is unchanged and we
      // should NOT re-fire play() on the just-ended track.
      const next = usePlayerStore.getState().currentTrack;
      if (next && next.id !== previous?.id && next.audioUrl) {
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
        const { tracks: fresh, isAdminCurated } = await fetchPlaylist();
        if (!fresh.length) return;
        const known = new Set(usePlayerStore.getState().queue.map((t) => t.id));
        // Admin-curated tracks keep their position order; fallback tracks are shuffled.
        const newTracks = isAdminCurated ? fresh : shuffle(fresh);
        const additions = newTracks.filter((t) => !known.has(t.id));
        if (!additions.length) return;
        const store = usePlayerStore.getState();
        store.setQueue([...store.queue, ...additions]);
      } finally {
        refetchingRef.current = false;
      }
    })();
  }, [currentTrack, queue]);

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = isMuted
  }, [isMuted])

  useEffect(() => {
    preloadAbortRef.current?.abort()
    preloadAbortRef.current = null

    const idx = queue.findIndex((t) => t.id === currentTrack?.id)
    const nextTrack = idx >= 0 ? queue[idx + 1] : undefined
    if (!nextTrack) return

    // SECURITY: Get public audio URL only. Never use vault_audio_id.
    const audioUrl = nextTrack.audioUrl
    if (!audioUrl || typeof audioUrl !== 'string') return
    if (audioUrl.trim() === '') return

    // SECURITY: Skip if URL looks like a vault/signed URL
    if (audioUrl.includes('s--')) return

    // CONNECTION AWARENESS: Skip prefetch on slow or metered connections
    if (typeof window !== 'undefined') {
      const conn = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }).connection
      if (conn?.saveData === true) return
      const slowTypes = ['slow-2g', '2g']
      if (conn?.effectiveType && slowTypes.includes(conn.effectiveType)) return
    }

    const delay = setTimeout(() => {
      try {
        const controller = new AbortController()
        preloadAbortRef.current = controller
        fetch(audioUrl, {
          method: 'GET',
          credentials: 'omit',
          signal: controller.signal,
        }).catch((err) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            Sentry.addBreadcrumb({
              category: 'audio.prestream',
              message: 'Prefetch failed silently',
              level: 'debug',
              data: { trackId: nextTrack.id },
            })
          }
        })
      } catch {
        // Prefetch errors must never surface to UI
      }
    }, 5000)

    return () => {
      clearTimeout(delay)
      preloadAbortRef.current?.abort()
      preloadAbortRef.current = null
    }
  }, [currentTrack?.id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = () => {
      if (timer !== null) { clearTimeout(timer); timer = null }
    }

    const startTimer = (durationMs: number) => {
      clearTimer()
      timer = setTimeout(() => {
        setConnectionStatus('interference')
      }, durationMs)
    }

    const handleTimeUpdate = () => {
      if (audio.currentTime > 2) hasPlayedRef.current = true
    }

    const handleWaiting = () => {
      if (!hasPlayedRef.current) return
      if (audio.seeking) return
      const status = usePlayerStore.getState().connectionStatus
      if (status === 'interference') return
      if (typeof window !== 'undefined' && !navigator.onLine) {
        setConnectionStatus('interference')
        return
      }
      setConnectionStatus('reconnecting')
      startTimer(9000)
    }

    const handleStalled = () => { handleWaiting() }
    const handleCanPlay = () => { clearTimer(); setConnectionStatus('ok') }
    const handlePlaying = () => { clearTimer(); setConnectionStatus('ok') }
    const handleError = () => {
      if (!hasPlayedRef.current) return
      clearTimer()
      startTimer(3000)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('stalled', handleStalled)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('error', handleError)

    return () => {
      clearTimer()
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('stalled', handleStalled)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('error', handleError)
    }
  }, [])

  // Reset connection state when track changes:
  useEffect(() => {
    hasPlayedRef.current = false
    resetConnectionState()
  }, [currentTrack?.id])

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
      // TrackRow gates clicks already, but keep this defensive — any future
      // caller that hands us a non-streamable track should be a no-op rather
      // than mutating store state into a "playing but silent" condition.
      if (!track.audioUrl) {
        console.warn(
          "[PlayerContext] playFromTrack: skipping track without audioUrl:",
          track.title,
        );
        return;
      }
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
      const before = store.currentTrack;
      store.playAlbum(album);
      const next = usePlayerStore.getState().currentTrack;
      // playAlbum is a no-op when the album has no playable tracks; detect
      // that and don't resume the previously-loaded track.
      if (!next || !next.audioUrl || next === before) {
        console.warn(
          "[PlayerContext] playFromAlbum: no playable tracks in",
          album.title,
        );
        return;
      }
      const audio = ensureSrc(next);
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
    const before = store.currentTrack;
    store.nextTrack();
    const next = usePlayerStore.getState().currentTrack;
    // If nextTrack didn't advance (no playable left), don't restart current.
    if (!next || next.id === before?.id) return;
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
    const before = store.currentTrack;
    store.previousTrack();
    const prev = usePlayerStore.getState().currentTrack;
    if (!prev || prev.id === before?.id) return;
    const audio = ensureSrc(prev);
    console.log("[PlayerContext] previousAndPlay src before play:", audio?.src);
    if (audio) {
      audio.play().catch((err) => {
        console.warn("[PlayerContext] previousAndPlay play() rejected:", err);
        store.setPlaying(false);
      });
    }
  }, [ensureSrc]);

  const primePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Start playback of whatever track is current, syncing the store on success.
    const start = () => {
      const a = audioRef.current;
      if (!a) return;
      const store = usePlayerStore.getState();
      const track = store.currentTrack;
      if (!track?.audioUrl) return;
      ensureSrc(track);
      const r = a.play();
      if (r instanceof Promise) {
        r.then(() => usePlayerStore.getState().setPlaying(true)).catch(() => {});
      } else {
        usePlayerStore.getState().setPlaying(true);
      }
    };

    // Try to autoplay right now. Returning visitors with sufficient media
    // engagement (Chrome MEI) — or an already-unlocked element — succeed here.
    const r = audio.play();
    if (r instanceof Promise) {
      r.then(() => {
        usePlayerStore.getState().setPlaying(true);
      }).catch(() => {
        // Blocked by autoplay policy — wait for the user's first interaction.
        if (primedRef.current) return;
        primedRef.current = true;
        const onGesture = () => {
          window.removeEventListener("pointerdown", onGesture);
          window.removeEventListener("keydown", onGesture);
          window.removeEventListener("touchstart", onGesture);
          start();
        };
        window.addEventListener("pointerdown", onGesture, { once: true });
        window.addEventListener("keydown", onGesture, { once: true });
        window.addEventListener("touchstart", onGesture, { once: true });
      });
    }
  }, [ensureSrc]);

  const ensureQueueSeeded = useCallback(
    async (autoplay = false) => {
      const store = usePlayerStore.getState();

      // Already populated — just (optionally) resume the loaded track.
      if (store.queue.length > 0) {
        if (autoplay && store.currentTrack?.audioUrl) {
          ensureSrc(store.currentTrack);
          primePlayback();
        }
        return;
      }

      if (seedingRef.current) return;
      seedingRef.current = true;
      try {
        const { tracks: fresh, isAdminCurated } = await fetchPlaylist();
        const { queue, first, album } = buildSeed(fresh, { ordered: isAdminCurated });
        if (!first) return;
        store.setQueue(queue, first, album);
        // Set src after the await, then prime playback. primePlayback attempts
        // autoplay and, if the browser blocks it, arms a one-time gesture
        // listener — so playback starts even though the gesture token is gone.
        ensureSrc(first);
        if (autoplay) primePlayback();
      } finally {
        seedingRef.current = false;
      }
    },
    [ensureSrc, primePlayback],
  );

  const playAlbumBySlug = useCallback(
    async (slug: string) => {
      try {
        const res = await fetch(`/api/albums/${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!res.ok) return;
        const album = (await res.json()) as import("@/types/music").Album;
        playFromAlbum(album);
      } catch {
        // silently ignore fetch errors — player state unchanged
      }
    },
    [playFromAlbum],
  );

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        togglePlayPause,
        playFromTrack,
        playFromAlbum,
        playAlbumBySlug,
        nextAndPlay,
        previousAndPlay,
        ensureQueueSeeded,
        primePlayback,
      }}
    >
      {children}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
