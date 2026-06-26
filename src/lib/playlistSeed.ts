import type { Album, Track } from "@/types/music";

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Builds a shuffled player queue from a list of tracks, promoting the first
 * track that carries album cover art to position 0 (so the player opens with a
 * cover rather than a blank tile) and constructing the seed `Album` from that
 * track's joined album metadata.
 *
 * Shared by `PlayerSeeder` (synchronous seed from server-prefetched tracks) and
 * `PlayerContext.ensureQueueSeeded` (client-side fallback fetch) so both paths
 * produce an identical queue shape.
 */
export function buildSeed(tracks: Track[]): {
  queue: Track[];
  first: Track | null;
  album: Album | null;
} {
  const playable = tracks.filter((t) => !!t.audioUrl);
  if (!playable.length) return { queue: [], first: null, album: null };

  const shuffled = shuffle(playable);
  const firstWithCover =
    shuffled.find((t) => !!(t.albumId && t.albumCoverImage)) ?? null;
  const first = firstWithCover ?? shuffled[0] ?? null;
  const queue =
    first && first !== shuffled[0]
      ? [first, ...shuffled.filter((t) => t.id !== first.id)]
      : shuffled;

  const album: Album | null =
    first?.albumId && first.albumCoverImage
      ? {
          id: first.albumId,
          slug: first.albumSlug ?? "",
          title: first.albumTitle ?? "",
          description: "",
          releaseDate: "",
          coverImage: first.albumCoverImage,
          bgColor: first.albumBgColor ?? "#090f0e",
          accentColor: first.albumAccentColor ?? "#62f3e4",
          spotifyUrl: "",
          tracks: [],
        }
      : null;

  return { queue, first, album };
}
