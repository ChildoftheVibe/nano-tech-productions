import { create } from "zustand";

export type Track = {
  id: string;
  title: string;
  artist: string;
  url: string;
  artwork?: string;
};

type PlayerState = {
  current: Track | null;
  queue: Track[];
  isPlaying: boolean;
  setCurrent: (t: Track | null) => void;
  setQueue: (q: Track[]) => void;
  setPlaying: (p: boolean) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  current: null,
  queue: [],
  isPlaying: false,
  setCurrent: (current) => set({ current }),
  setQueue: (queue) => set({ queue }),
  setPlaying: (isPlaying) => set({ isPlaying }),
}));
