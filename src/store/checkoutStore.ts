import { create } from "zustand";
import type { Album, Instrumental, Track } from "@/types/music";

export type CheckoutItemKind = "track" | "album" | "instrumental";

export type CheckoutItemRef = {
  id: string;
  kind: CheckoutItemKind;
  name: string;
  price: number;
  coverImage?: string;
  bgColor?: string;
  accentColor?: string;
  trackIds: string[];
  albumId?: string;
  /** Set when kind === "instrumental" so the verify route can mint the
   *  right token type without re-resolving the row. */
  instrumentalId?: string;
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

export function instrumentalCheckoutItem(
  instrumental: Instrumental,
): CheckoutItemRef {
  return {
    id: instrumental.id,
    kind: "instrumental",
    name: instrumental.title,
    price: instrumental.price,
    coverImage: instrumental.coverImage ?? undefined,
    bgColor: "#1a0838",
    accentColor: "#3DD6C8",
    trackIds: [],
    instrumentalId: instrumental.id,
  };
}
