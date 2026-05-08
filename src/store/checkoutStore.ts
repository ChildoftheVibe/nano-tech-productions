import { create } from "zustand";
import type { Album, Track } from "@/types/music";

export type CheckoutItemRef = {
  id: string;
  kind: "track" | "album";
  name: string;
  price: number;
  coverImage?: string;
  bgColor?: string;
  accentColor?: string;
  trackIds: string[];
  albumId?: string;
};

type CheckoutState = {
  isOpen: boolean;
  item: CheckoutItemRef | null;
  open: (item: CheckoutItemRef) => void;
  close: () => void;
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  isOpen: false,
  item: null,
  open: (item) => set({ isOpen: true, item }),
  close: () => set({ isOpen: false, item: null }),
}));

export function trackCheckoutItem(track: Track, album: Album): CheckoutItemRef {
  return {
    id: track.id,
    kind: "track",
    name: track.title,
    price: track.price,
    coverImage: album.coverImage,
    bgColor: album.bgColor,
    accentColor: album.accentColor,
    trackIds: [track.id],
    albumId: album.id,
  };
}

export function albumCheckoutItem(album: Album, price: number): CheckoutItemRef {
  return {
    id: album.id,
    kind: "album",
    name: album.title,
    price,
    coverImage: album.coverImage,
    bgColor: album.bgColor,
    accentColor: album.accentColor,
    trackIds: album.tracks.map((t) => t.id),
    albumId: album.id,
  };
}
