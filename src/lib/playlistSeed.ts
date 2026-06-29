import type { Album, Track } from "@/types/music";

/**
 * Build a minimal Album from the album metadata embedded on a playlist Track
 * (populated by the album join in `getPlaylistTracks`). Returns null when the
 * track carries no embedded cover — e.g. tracks fetched as part of a full Album
 * query, where the caller already holds the real Album. Used to keep the
 * player's `currentAlbum` in sync as a mixed-album queue advances, so every
 * track shows its own cover/accent when it plays.
 */
export function albumFromTrack(track: Track | null | undefined): Album | null {
  if (!track?.albumId || !track.albumCoverImage) return null;
  return {
    id: track.albumId,
    slug: track.albumSlug ?? "",
    title: track.albumTitle ?? "",
    description: "",
    releaseDate: "",
    coverImage: track.albumCoverImage,
    bgColor: track.albumBgColor ?? "#090f0e",
    accentColor: track.albumAccentColor ?? "#62f3e4",
    spotifyUrl: "",
    tracks: [],
  };
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Builds a player queue from a list of tracks.
 *
 * When `ordered` is false (default) the queue is shuffled and the first track
 * that carries album cover art is promoted to position 0.
 *
 * When `ordered` is true (admin-curated playlist) the tracks are used as-is
 * (preserving the admin's position ordering); only the first track with cover
 * art is moved to position 0 so the player can show album art immediately.
 *
 * Shared by `PlayerSeeder` (synchronous seed from server-prefetched tracks) and
 * `PlayerContext.ensureQueueSeeded` (client-side fallback fetch) so both paths
 * produce an identical queue shape.
 */
export function buildSeed(
  tracks: Track[],
  { ordered = false }: { ordered?: boolean } = {},
): {
  queue: Track[];
  first: Track | null;
  album: Album | null;
} {
  const playable = tracks.filter((t) => !!t.audioUrl);
  if (!playable.length) return { queue: [], first: null, album: null };

  const pool = ordered ? playable : shuffle(playable);
  const firstWithCover =
    pool.find((t) => !!(t.albumId && t.albumCoverImage)) ?? null;
  const first = firstWithCover ?? pool[0] ?? null;
  const queue =
    first && first !== pool[0]
      ? [first, ...pool.filter((t) => t.id !== first.id)]
      : pool;

  const album = albumFromTrack(first);

  return { queue, first, album };
}
