import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import type { Album, AlbumListResult, Track, TrackCredits } from "@/types/music";

const ALBUM_COLUMNS =
  "id, slug, title, description, release_date, cover_image, background_color, accent_color, spotify_url, apple_music_url, youtube_url, amazon_url, copyright, is_published";
const TRACK_COLUMNS =
  "id, album_id, title, track_number, duration, price, audio_url, features, is_published, credits, lyrics, has_lyrics";

type AlbumRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  release_date: string | null;
  cover_image: string | null;
  background_color: string | null;
  accent_color: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  youtube_url: string | null;
  amazon_url: string | null;
  copyright: string | null;
  is_published: boolean;
  tracks?: TrackRow[];
};

type TrackRow = {
  id: string;
  album_id: string | null;
  title: string;
  track_number: number | null;
  duration: string | null;
  price: number | string;
  audio_url: string | null;
  features: string[] | null;
  is_published: boolean;
  credits: TrackCredits | null;
  lyrics: string | null;
  has_lyrics: boolean | null;
};

const mapTrack = (row: TrackRow): Track => ({
  id: row.id,
  albumId: row.album_id ?? "",
  title: row.title,
  trackNumber: row.track_number ?? 0,
  duration: row.duration ?? "0:00",
  price: Number(row.price ?? 0),
  features: row.features ?? undefined,
  audioUrl: row.audio_url ?? undefined,
  credits: row.credits ?? {},
  lyrics: row.lyrics,
  has_lyrics: !!row.has_lyrics,
});

const mapAlbum = (row: AlbumRow, tracks: Track[] = []): Album => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description ?? "",
  releaseDate: row.release_date ?? "",
  coverImage: row.cover_image ?? "",
  bgColor: row.background_color ?? "#393838",
  accentColor: row.accent_color ?? "#3DD6C8",
  spotifyUrl: row.spotify_url ?? "",
  appleMusicUrl: row.apple_music_url ?? undefined,
  youtubeUrl: row.youtube_url ?? undefined,
  amazonUrl: row.amazon_url ?? undefined,
  copyright: row.copyright ?? undefined,
  tracks,
});

export type GetAlbumsOpts = {
  page?: number;
  limit?: number;
  published?: boolean;
};

export const getAlbums = unstable_cache(
  async ({ page = 1, limit = 20, published = true }: GetAlbumsOpts = {}): Promise<AlbumListResult> => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    let q = supabase
      .from("albums")
      .select(ALBUM_COLUMNS, { count: "exact" })
      .order("release_date", { ascending: false })
      .range(start, end);
    if (published) q = q.eq("is_published", true);
    const { data, count, error } = await q;
    if (error) {
      console.error("[queries.getAlbums]", error.message);
      return { albums: [], totalCount: 0, hasMore: false };
    }
    const albums = ((data ?? []) as AlbumRow[]).map((row) => mapAlbum(row));
    const totalCount = count ?? 0;
    return {
      albums,
      totalCount,
      hasMore: start + albums.length < totalCount,
    };
  },
  ["albums-list"],
  { revalidate: 300, tags: ["albums"] },
);

export const getFeaturedAlbums = unstable_cache(
  async (): Promise<Album[]> => {
    const { albums } = await getAlbums({ page: 1, limit: 6, published: true });
    return albums;
  },
  ["albums-featured"],
  { revalidate: 300, tags: ["albums"] },
);

export const getAlbum = unstable_cache(
  async (slug: string): Promise<Album | null> => {
    const { data, error } = await supabase
      .from("albums")
      .select(`${ALBUM_COLUMNS}, tracks(${TRACK_COLUMNS})`)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("[queries.getAlbum]", error.message);
      return null;
    }
    const row = data as AlbumRow;
    const tracks = (row.tracks ?? [])
      .filter((t) => t.is_published)
      .map(mapTrack)
      .sort((a, b) => a.trackNumber - b.trackNumber);
    return mapAlbum(row, tracks);
  },
  ["album-by-slug"],
  { revalidate: 60, tags: ["albums"] },
);

export const getAlbumById = unstable_cache(
  async (id: string): Promise<Album | null> => {
    const { data, error } = await supabase
      .from("albums")
      .select(`${ALBUM_COLUMNS}, tracks(${TRACK_COLUMNS})`)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("[queries.getAlbumById]", error.message);
      return null;
    }
    const row = data as AlbumRow;
    const tracks = (row.tracks ?? [])
      .filter((t) => t.is_published)
      .map(mapTrack)
      .sort((a, b) => a.trackNumber - b.trackNumber);
    return mapAlbum(row, tracks);
  },
  ["album-by-id"],
  { revalidate: 60, tags: ["albums"] },
);

export type GetTracksOpts = {
  albumId?: string;
  published?: boolean;
  limit?: number;
  offset?: number;
};

export const getTracks = unstable_cache(
  async ({ albumId, published = true, limit = 50, offset = 0 }: GetTracksOpts = {}): Promise<{
    tracks: Track[];
    totalCount: number;
    hasMore: boolean;
  }> => {
    let q = supabase
      .from("tracks")
      .select(TRACK_COLUMNS, { count: "exact" })
      .order("track_number", { ascending: true })
      .range(offset, offset + limit - 1);
    if (albumId) q = q.eq("album_id", albumId);
    if (published) q = q.eq("is_published", true);
    const { data, count, error } = await q;
    if (error) {
      console.error("[queries.getTracks]", error.message);
      return { tracks: [], totalCount: 0, hasMore: false };
    }
    const tracks = ((data ?? []) as TrackRow[]).map(mapTrack);
    const totalCount = count ?? 0;
    return { tracks, totalCount, hasMore: offset + tracks.length < totalCount };
  },
  ["tracks-list"],
  { revalidate: 60, tags: ["tracks"] },
);

const PLAYLIST_MAX = 500;

export const getPlaylistTracks = unstable_cache(
  async (): Promise<Track[]> => {
    const { data, error } = await supabase
      .from("tracks")
      .select(TRACK_COLUMNS)
      .eq("is_published", true)
      .not("audio_url", "is", null)
      .limit(PLAYLIST_MAX);
    if (error) {
      console.error("[queries.getPlaylistTracks]", error.message);
      return [];
    }
    return ((data ?? []) as TrackRow[]).filter((r) => !!r.audio_url).map(mapTrack);
  },
  ["playlist-tracks"],
  { revalidate: 60, tags: ["playlist"] },
);

export const searchAlbums = unstable_cache(
  async (query: string): Promise<Album[]> => {
    const q = query.trim();
    if (!q) return [];
    const { data, error } = await supabase
      .from("albums")
      .select(ALBUM_COLUMNS)
      .eq("is_published", true)
      .textSearch("search_vector", q, { type: "websearch", config: "english" })
      .limit(50);
    if (error) {
      console.error("[queries.searchAlbums]", error.message);
      return [];
    }
    return ((data ?? []) as AlbumRow[]).map((row) => mapAlbum(row));
  },
  ["albums-search"],
  { revalidate: 60, tags: ["albums"] },
);

export type SearchTrack = Track & { albumSlug: string | null };

export type SearchResult = {
  albums: Album[];
  tracks: SearchTrack[];
  artists: string[];
};

const SEARCH_LIMITS = { albums: 5, tracks: 10, artists: 5 } as const;

const escapeIlike = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

const escapeForOr = (s: string) => s.replace(/,/g, " ").replace(/\)/g, " ");

export const searchContent = unstable_cache(
  async (rawQuery: string): Promise<SearchResult> => {
    const query = rawQuery.trim();
    if (query.length < 2) {
      return { albums: [], tracks: [], artists: [] };
    }

    const ilikeNeedle = `%${escapeForOr(escapeIlike(query))}%`;

    // Albums: prefer full-text via search_vector, fall back to ilike when the
    // websearch parse yields no rows (short tokens, partial matches).
    let albumRows: AlbumRow[] = [];
    {
      const { data, error } = await supabase
        .from("albums")
        .select(ALBUM_COLUMNS)
        .eq("is_published", true)
        .textSearch("search_vector", query, {
          type: "websearch",
          config: "english",
        })
        .limit(SEARCH_LIMITS.albums);
      if (error) {
        console.error("[queries.searchContent albums.textSearch]", error.message);
      } else if (data) {
        albumRows = data as AlbumRow[];
      }
    }
    if (albumRows.length === 0) {
      const { data, error } = await supabase
        .from("albums")
        .select(ALBUM_COLUMNS)
        .eq("is_published", true)
        .or(`title.ilike.${ilikeNeedle},description.ilike.${ilikeNeedle}`)
        .limit(SEARCH_LIMITS.albums);
      if (error) {
        console.error("[queries.searchContent albums.ilike]", error.message);
      } else if (data) {
        albumRows = data as AlbumRow[];
      }
    }

    // Tracks: ilike on title only (no tracks.search_vector). Feature matches
    // surface in the artists section, not as track results.
    type TrackSearchRow = TrackRow & {
      albums: { slug: string } | { slug: string }[] | null;
    };
    let trackRows: TrackSearchRow[] = [];
    {
      const { data, error } = await supabase
        .from("tracks")
        .select(`${TRACK_COLUMNS}, albums:album_id(slug)`)
        .eq("is_published", true)
        .ilike("title", ilikeNeedle)
        .limit(SEARCH_LIMITS.tracks);
      if (error) {
        console.error("[queries.searchContent tracks]", error.message);
      } else if (data) {
        trackRows = data as unknown as TrackSearchRow[];
      }
    }

    // Artists: distinct names from tracks.features that match the query.
    // Pull a wider sample then filter/dedupe in memory — features is a TEXT[]
    // and there's no clean partial-match operator across array elements.
    const artists: string[] = [];
    {
      const { data, error } = await supabase
        .from("tracks")
        .select("features")
        .eq("is_published", true)
        .not("features", "is", null)
        .limit(500);
      if (error) {
        console.error("[queries.searchContent artists]", error.message);
      } else if (data) {
        const needle = query.toLowerCase();
        const seen = new Set<string>();
        for (const row of data as Array<{ features: string[] | null }>) {
          if (!row.features) continue;
          for (const f of row.features) {
            if (typeof f !== "string") continue;
            const key = f.toLowerCase();
            if (seen.has(key)) continue;
            if (!key.includes(needle)) continue;
            seen.add(key);
            artists.push(f);
            if (artists.length >= SEARCH_LIMITS.artists) break;
          }
          if (artists.length >= SEARCH_LIMITS.artists) break;
        }
      }
    }

    return {
      albums: albumRows.map((row) => mapAlbum(row)),
      tracks: trackRows.map((row) => {
        const slug = Array.isArray(row.albums)
          ? row.albums[0]?.slug ?? null
          : row.albums?.slug ?? null;
        return { ...mapTrack(row), albumSlug: slug };
      }),
      artists,
    };
  },
  ["search-content"],
  { revalidate: 60, tags: ["albums", "tracks"] },
);

// Library: albums with track-level play_count rolled up so the client can sort
// by Most Played without a second round-trip.
export type LibraryAlbum = Album & {
  trackCount: number;
  totalPlayCount: number;
};

export const getLibraryAlbums = unstable_cache(
  async (): Promise<LibraryAlbum[]> => {
    const { data, error } = await supabase
      .from("albums")
      .select(`${ALBUM_COLUMNS}, tracks(id, play_count, is_published)`)
      .eq("is_published", true)
      .order("release_date", { ascending: false });
    if (error) {
      console.error("[queries.getLibraryAlbums]", error.message);
      return [];
    }
    type LibTrack = { id: string; play_count: number | null; is_published: boolean };
    type LibRow = Omit<AlbumRow, "tracks"> & { tracks?: LibTrack[] };
    return ((data ?? []) as LibRow[]).map((row) => {
      const published = (row.tracks ?? []).filter((t) => t.is_published);
      const totalPlayCount = published.reduce(
        (sum, t) => sum + (t.play_count ?? 0),
        0,
      );
      const album = mapAlbum(row as unknown as AlbumRow);
      return { ...album, trackCount: published.length, totalPlayCount };
    });
  },
  ["library-albums"],
  { revalidate: 300, tags: ["albums", "tracks"] },
);

export const getAllAlbumSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from("albums")
      .select("slug")
      .eq("is_published", true);
    if (error || !data) return [];
    return (data as Array<{ slug: string }>).map((r) => r.slug);
  },
  ["album-slugs"],
  { revalidate: 600, tags: ["albums"] },
);
