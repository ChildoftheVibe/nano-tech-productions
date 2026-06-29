import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Album, Track } from "@/types/music";
import { albumFromTrack } from "@/lib/playlistSeed";

export type RepeatMode = "off" | "all" | "one";
export type ConnectionStatus = 'ok' | 'reconnecting' | 'interference'

type PlayerState = {
  currentTrack: Track | null;
  currentAlbum: Album | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  seekRequestId: number;
  fullScreenOpen: boolean;
  lyricsOpen: boolean;
  isMuted: boolean;
  connectionStatus: ConnectionStatus;
  retryCount: number;

  playTrack: (track: Track, album?: Album | null) => void;
  playAlbum: (album: Album) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (v: number) => void;
  seekTo: (seconds: number) => void;
  setCurrentTime: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  shuffleQueue: () => void;
  addToQueue: (track: Track) => void;
  setQueue: (queue: Track[], currentTrack?: Track | null, album?: Album | null) => void;
  openFullScreen: () => void;
  closeFullScreen: () => void;
  openLyrics: () => void;
  closeLyrics: () => void;
  toggleLyrics: () => void;
  toggleMute: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  incrementRetryCount: () => void;
  resetConnectionState: () => void;
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const indexOfTrack = (queue: Track[], track: Track | null) =>
  track ? queue.findIndex((t) => t.id === track.id) : -1;

// State patch for switching the active track. When the track carries embedded
// album metadata (mixed playlist queues), also swap currentAlbum so the player
// shows that track's own cover/accent. Tracks from a full-album queue have no
// embedded metadata, so currentAlbum is left untouched (it already holds the
// real album).
const advanceTo = (track: Track) => {
  const album = albumFromTrack(track);
  return {
    currentTrack: track,
    currentTime: 0,
    isPlaying: true,
    ...(album ? { currentAlbum: album } : {}),
  };
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      currentAlbum: null,
      queue: [],
      isPlaying: false,
      volume: 0.7,
      currentTime: 0,
      duration: 0,
      shuffle: false,
      repeat: "off",
      seekRequestId: 0,
      fullScreenOpen: false,
      lyricsOpen: false,
      isMuted: false,
      connectionStatus: 'ok' as ConnectionStatus,
      retryCount: 0,

      playTrack: (track, album = null) => {
        // Refuse to switch to a track that has no audioUrl. Setting it as
        // currentTrack would put the player in a "playing but silent" state
        // because PlayerContext can't load src for it.
        if (!track.audioUrl) return;
        const { queue } = get();
        const inQueue = queue.some((t) => t.id === track.id);
        set({
          currentTrack: track,
          // Prefer the explicitly-passed album; otherwise derive it from the
          // track's embedded playlist metadata so the cover is never blank.
          currentAlbum: album ?? albumFromTrack(track),
          queue: inQueue ? queue : [track, ...queue],
          isPlaying: true,
          currentTime: 0,
          duration: 0,
        });
      },

      playAlbum: (album) => {
        if (!album.tracks.length) return;
        // Exclude vault-only tracks (no public audioUrl) before building the queue.
        const playable = album.tracks.filter((t) => !!t.audioUrl);
        if (!playable.length) return;
        const ordered = get().shuffle ? shuffleArray(playable) : playable;
        const first = ordered.find((t) => !!t.audioUrl);
        if (!first) return;
        set({
          currentAlbum: album,
          queue: ordered,
          currentTrack: first,
          isPlaying: true,
          currentTime: 0,
          duration: 0,
        });
      },

      togglePlay: () => set({ isPlaying: !get().isPlaying }),

      setPlaying: (isPlaying) => set({ isPlaying }),

      nextTrack: () => {
        const { queue, currentTrack, repeat } = get();
        if (!queue.length) return;
        if (repeat === "one" && currentTrack) {
          set({ currentTime: 0, seekRequestId: get().seekRequestId + 1, isPlaying: true });
          return;
        }
        const idx = indexOfTrack(queue, currentTrack);
        // Walk forward for the next track that's actually playable.
        for (let i = idx + 1; i < queue.length; i++) {
          if (queue[i].audioUrl) {
            set(advanceTo(queue[i]));
            return;
          }
        }
        // Nothing playable ahead. With repeat="all", wrap to the first
        // playable from the top; otherwise stop.
        if (repeat === "all") {
          for (let i = 0; i < queue.length; i++) {
            if (queue[i].audioUrl) {
              set(advanceTo(queue[i]));
              return;
            }
          }
        }
        set({ isPlaying: false, currentTime: 0 });
      },

      previousTrack: () => {
        const { queue, currentTrack, currentTime } = get();
        if (!queue.length) return;
        if (currentTime > 3) {
          set({ currentTime: 0, seekRequestId: get().seekRequestId + 1 });
          return;
        }
        const idx = indexOfTrack(queue, currentTrack);
        // Walk backwards (wrap) until we find a playable track.
        for (let step = 1; step <= queue.length; step++) {
          const target = (idx - step + queue.length) % queue.length;
          if (queue[target]?.audioUrl) {
            set(advanceTo(queue[target]));
            return;
          }
        }
        set({ isPlaying: false });
      },

      setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),

      seekTo: (seconds) =>
        set({ currentTime: seconds, seekRequestId: get().seekRequestId + 1 }),

      setCurrentTime: (currentTime) => set({ currentTime }),

      setDuration: (duration) => set({ duration }),

      toggleShuffle: () => {
        const { shuffle, queue, currentTrack } = get();
        const next = !shuffle;
        if (next && queue.length > 1) {
          const idx = indexOfTrack(queue, currentTrack);
          const head = idx >= 0 ? [queue[idx]] : [];
          const rest = queue.filter((_, i) => i !== idx);
          set({ shuffle: next, queue: [...head, ...shuffleArray(rest)] });
        } else {
          set({ shuffle: next });
        }
      },

      toggleRepeat: () => {
        const order: RepeatMode[] = ["off", "all", "one"];
        const idx = order.indexOf(get().repeat);
        set({ repeat: order[(idx + 1) % order.length] });
      },

      shuffleQueue: () => {
        const { queue, currentTrack } = get();
        if (queue.length < 2) return;
        const idx = indexOfTrack(queue, currentTrack);
        const head = idx >= 0 ? [queue[idx]] : [];
        const rest = queue.filter((_, i) => i !== idx);
        set({ queue: [...head, ...shuffleArray(rest)] });
      },

      addToQueue: (track) => set({ queue: [...get().queue, track] }),

      setQueue: (queue, currentTrack, album) => {
        set({
          queue,
          ...(currentTrack !== undefined ? { currentTrack } : {}),
          // Only update currentAlbum when explicitly passed; undefined = leave as-is.
          ...(album !== undefined ? { currentAlbum: album } : {}),
        });
      },

      openFullScreen: () => set({ fullScreenOpen: true }),
      closeFullScreen: () => set({ fullScreenOpen: false }),

      openLyrics: () => set({ lyricsOpen: true }),
      closeLyrics: () => set({ lyricsOpen: false }),
      toggleLyrics: () => set({ lyricsOpen: !get().lyricsOpen }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setConnectionStatus: (status: ConnectionStatus) => set({ connectionStatus: status }),
      incrementRetryCount: () => set((state) => ({ retryCount: state.retryCount + 1 })),
      resetConnectionState: () => set({ connectionStatus: 'ok', retryCount: 0 }),
    }),
    {
      name: "ntv-player",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ volume: state.volume, shuffle: state.shuffle }),
    },
  ),
);
