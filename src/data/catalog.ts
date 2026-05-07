import type { Track } from "@/store/playerStore";

export type Album = {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  priceCents: number;
  tracks: Track[];
};

export const catalog: Album[] = [];
