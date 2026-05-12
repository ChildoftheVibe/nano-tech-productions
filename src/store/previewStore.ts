"use client";

import { create } from "zustand";

/**
 * Standalone preview-player state. Drives the per-card 30-second clips on
 * /sounds. Completely separate from the main continuous player so toggling
 * a preview never disturbs the album playlist queue, currentTrack, or any
 * Audio element the main player owns.
 *
 * A single module-level <audio> element is reused across all PreviewPlayer
 * instances. The store coordinates which instrumental owns it at any
 * given moment — starting a new preview hard-stops whatever was playing.
 */

type PreviewState = {
  currentPreviewId: string | null;
  isPreviewPlaying: boolean;
  previewProgress: number;
  previewDuration: number;
  playPreview: (instrumentalId: string, previewUrl: string) => void;
  stopPreview: () => void;
};

const PREVIEW_LIMIT_SECONDS = 30;

let audioEl: HTMLAudioElement | null = null;

const getAudio = (): HTMLAudioElement | null => {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "metadata";
    audioEl.crossOrigin = "anonymous";
  }
  return audioEl;
};

export const usePreviewStore = create<PreviewState>((set, get) => ({
  currentPreviewId: null,
  isPreviewPlaying: false,
  previewProgress: 0,
  previewDuration: 0,

  playPreview: (instrumentalId, previewUrl) => {
    const audio = getAudio();
    if (!audio || !previewUrl) return;

    const sameTrack = get().currentPreviewId === instrumentalId;
    if (sameTrack && get().isPreviewPlaying) {
      // Toggle: pressing play on the active preview pauses it.
      audio.pause();
      set({ isPreviewPlaying: false });
      return;
    }
    if (sameTrack) {
      // Resume.
      audio
        .play()
        .then(() => set({ isPreviewPlaying: true }))
        .catch((err) => {
          console.warn("[preview] resume rejected:", err);
          set({ isPreviewPlaying: false });
        });
      return;
    }

    // Switching tracks: hard-reset before assigning new src.
    audio.pause();
    audio.currentTime = 0;
    audio.src = previewUrl;
    audio.load();
    set({
      currentPreviewId: instrumentalId,
      previewProgress: 0,
      previewDuration: 0,
      isPreviewPlaying: false,
    });

    audio
      .play()
      .then(() => set({ isPreviewPlaying: true }))
      .catch((err) => {
        console.warn("[preview] play rejected:", err);
        set({ isPreviewPlaying: false });
      });
  },

  stopPreview: () => {
    const audio = getAudio();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    set({
      currentPreviewId: null,
      isPreviewPlaying: false,
      previewProgress: 0,
    });
  },
}));

// Wire up audio element lifecycle once on first import in a client context.
// `timeupdate` enforces the 30s cap server-side already, but doing it here
// gives smoother UX — the preview stops exactly at 30s even if Cloudinary
// served a slightly longer clip.
if (typeof window !== "undefined") {
  const audio = getAudio();
  if (audio) {
    audio.addEventListener("timeupdate", () => {
      const t = audio.currentTime;
      usePreviewStore.setState({ previewProgress: t });
      if (t >= PREVIEW_LIMIT_SECONDS) {
        audio.pause();
        audio.currentTime = 0;
        usePreviewStore.setState({
          isPreviewPlaying: false,
          previewProgress: PREVIEW_LIMIT_SECONDS,
        });
      }
    });
    audio.addEventListener("loadedmetadata", () => {
      usePreviewStore.setState({
        previewDuration: Math.min(audio.duration || 0, PREVIEW_LIMIT_SECONDS),
      });
    });
    audio.addEventListener("ended", () => {
      usePreviewStore.setState({
        isPreviewPlaying: false,
        previewProgress: 0,
      });
    });
    audio.addEventListener("error", () => {
      console.warn("[preview] audio element error", audio.error);
      usePreviewStore.setState({
        isPreviewPlaying: false,
      });
    });
  }
}

export { PREVIEW_LIMIT_SECONDS };
