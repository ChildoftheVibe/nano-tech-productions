import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import { logError, logInfo } from "@/lib/logger";
import {
  getInstrumentalPreviewUrl,
  getInstrumentalStreamUrl,
  getPublicStreamingUrl,
} from "./cloudinary";
import type {
  Album,
  AlbumListResult,
  Artist,
  ArtistAlbum,
  ArtistListResult,
  ArtistRole,
  ArtistTrack,
  Instrumental,
  InstrumentalListResult,
  InstrumentalType,
  Track,
  TrackCredits,
} from "@/types/music";

const ALBUM_COLUMNS =
  "id, slug, title, description, release_date, cover_image, cover_videos, background_color, accent_color, spotify_url, apple_music_url, youtube_url, amazon_url, copyright, price, is_published";
const TRACK_COLUMNS =
  "id, album_id, title, track_number, duration, price, audio_url, public_audio_id, features, is_published, credits, lyrics, has_lyrics";

type AlbumRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  release_date: string | null;
  cover_image: string | null;
  cover_videos: string[] | null;
  background_color: string | null;
  accent_color: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  youtube_url: string | null;
  amazon_url: string | null;
  copyright: string | null;
  price: number | null;
  is_published: boolean;
  album_type?: string | null;
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
  public_audio_id: string | null;
  features: string[] | null;
  is_published: boolean;
  credits: TrackCredits | null;
  lyrics: string | null;
  has_lyrics: boolean | null;
  // Present only when the query includes an album join (playlist query).
  // PostgREST returns a many-to-one embed (tracks.album_id -> albums) as a
  // single object, but supabase-js has historically typed it as an array — so
  // accept either shape and normalize in mapTrack.
  albums?: AlbumEmbed | AlbumEmbed[] | null;
};

type AlbumEmbed = {
  id: string;
  slug: string;
  title: string;
  cover_image: string | null;
  bg_color: string | null;
  accent_color: string | null;
};

/** Build the streaming URL a Track exposes to the player.
 *  Order of preference:
 *   1. public_audio_id → getPublicStreamingUrl (gives MP3 320kbps via Cloudinary
 *      transformation — small file, fast first-byte, works well in <audio>).
 *   2. audio_url stored in the row (legacy fallback — usually a raw .wav URL).
 *   3. undefined (track has no playable audio). */
function resolveAudioUrl(row: TrackRow): string | undefined {
  if (row.public_audio_id) {
    const streaming = getPublicStreamingUrl(row.public_audio_id);
    if (streaming) return streaming;
  }
  return row.audio_url ?? undefined;
}

const mapTrack = (row: TrackRow): Track => {
  // Normalize the embedded album, which PostgREST returns as an object for a
  // many-to-one join (older clients may surface it as a single-element array).
  const album = Array.isArray(row.albums) ? row.albums[0] : row.albums;
  return {
    id: row.id,
    albumId: row.album_id ?? "",
    title: row.title,
    trackNumber: row.track_number ?? 0,
    duration: row.duration ?? "0:00",
    price: Number(row.price ?? 0),
    features: row.features ?? undefined,
    audioUrl: resolveAudioUrl(row),
    credits: row.credits ?? {},
    lyrics: row.lyrics,
    has_lyrics: !!row.has_lyrics,
    // Album metadata — only present when row includes an album join.
    albumCoverImage: album?.cover_image ?? undefined,
    albumBgColor: album?.bg_color ?? undefined,
    albumAccentColor: album?.accent_color ?? undefined,
    albumSlug: album?.slug ?? undefined,
    albumTitle: album?.title ?? undefined,
  };
};

const mapAlbum = (row: AlbumRow, tracks: Track[] = []): Album => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description ?? "",
  releaseDate: row.release_date ?? "",
  coverImage: row.cover_image ?? "",
  coverVideos: Array.isArray(row.cover_videos)
    ? row.cover_videos.filter((v): v is string => typeof v === "string" && v.length > 0)
    : [],
  bgColor: row.background_color ?? "#393838",
  accentColor: row.accent_color ?? "#3DD6C8",
  spotifyUrl: row.spotify_url ?? "",
  appleMusicUrl: row.apple_music_url ?? undefined,
  youtubeUrl: row.youtube_url ?? undefined,
  amazonUrl: row.amazon_url ?? undefined,
  copyright: row.copyright ?? undefined,
  price: row.price ?? 9.99,
  tracks,
  album_type: (row.album_type as Album['album_type']) ?? 'album',
});

export type GetAlbumsOpts = {
  page?: number;
  limit?: number;
  published?: boolean;
  type?: string;
};

export const getAlbums = unstable_cache(
  async ({ page = 1, limit = 20, published = true, type }: GetAlbumsOpts = {}): Promise<AlbumListResult> => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    let q = supabase
      .from("albums")
      .select(ALBUM_COLUMNS, { count: "exact" })
      .order("release_date", { ascending: false })
      .range(start, end);
    if (published) q = q.eq("is_published", true);
    void type;
    const { data, count, error } = await q;
    if (error) {
      logError(error, { caller: "queries.getAlbums" });
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
    // Prefer the admin-curated featured_albums list; fall back to the first 3
    // published albums when no entries have been configured yet.
    const { data } = await supabase
      .from("featured_albums")
      .select(`position, album:albums(${ALBUM_COLUMNS})`)
      .eq("is_active", true)
      .order("position", { ascending: true, nullsFirst: false });

    if (data && data.length > 0) {
      const rows = data as Array<{
        position: number | null;
        album: AlbumRow | AlbumRow[] | null;
      }>;
      return rows.flatMap(({ album }) => {
        const a = Array.isArray(album) ? album[0] : album;
        if (!a) return [];
        return [mapAlbum(a)];
      });
    }

    // Fallback: no featured rows configured — return first 3 published albums.
    const { albums } = await getAlbums({ page: 1, limit: 3, published: true });
    return albums;
  },
  ["albums-featured"],
  { revalidate: 300, tags: ["albums", "featured"] },
);

export const getLatestAlbum = unstable_cache(
  async (): Promise<Album | null> => {
    const { data, error } = await supabase
      .from("albums")
      .select(`${ALBUM_COLUMNS}, tracks(${TRACK_COLUMNS})`)
      .eq("is_published", true)
      .order("release_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      if (error) logError(error, { caller: "queries.getLatestAlbum" });
      return null;
    }
    const row = data as AlbumRow;
    const tracks = (row.tracks ?? [])
      .filter((t) => t.is_published)
      .map(mapTrack)
      .sort((a, b) => a.trackNumber - b.trackNumber);
    return mapAlbum(row, tracks);
  },
  ["album-latest"],
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
      if (error) logError(error, { caller: "queries.getAlbum" });
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
      if (error) logError(error, { caller: "queries.getAlbumById" });
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
      logError(error, { caller: "queries.getTracks" });
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

export type PlaylistTracksResult = {
  tracks: Track[];
  /** True when the queue comes from the admin-managed playlist table (ordered
   *  by position). False when falling back to all published tracks (shuffled). */
  isAdminCurated: boolean;
};

export const getPlaylistTracks = unstable_cache(
  async (): Promise<PlaylistTracksResult> => {
    // 1. Try the admin-curated playlist first.
    //    Two-step approach to avoid complex nested-join syntax that can fail silently:
    //    a) Get ordered track IDs from the playlist table.
    //    b) Fetch full track + album data for those IDs using the same reliable
    //       query as the fallback, then restore position order in JS.
    const { data: playlistEntries, error: playlistError } = await supabase
      .from("playlist")
      .select("track_id, position")
      .eq("is_active", true)
      .order("position", { ascending: true })
      .limit(PLAYLIST_MAX);

    if (!playlistError && playlistEntries && playlistEntries.length > 0) {
      const orderedIds = (playlistEntries as { track_id: string; position: number }[]).map(
        (e) => e.track_id,
      );
      const { data: trackData, error: trackError } = await supabase
        .from("tracks")
        .select(`${TRACK_COLUMNS}, albums(id, slug, title, cover_image, bg_color:background_color, accent_color)`)
        .in("id", orderedIds)
        .eq("is_published", true)
        .or("audio_url.not.is.null,public_audio_id.not.is.null");

      if (!trackError && trackData) {
        const trackMap = new Map((trackData as TrackRow[]).map((t) => [t.id, t]));
        const tracks = orderedIds
          .map((id) => trackMap.get(id))
          .filter((t): t is TrackRow => !!t)
          .map(mapTrack)
          .filter((t) => !!t.audioUrl);

        if (tracks.length > 0) {
          logInfo("[queries] getPlaylistTracks (admin curated)", { count: tracks.length });
          return { tracks, isAdminCurated: true };
        }
      }
    }

    // 2. Fall back: all published tracks with audio (shuffled by the client).
    // A track is playable when EITHER audio_url is set (legacy direct URL) OR
    // public_audio_id is set (new path — we derive an MP3 streaming URL from
    // it). Filter on that or-clause so newly-uploaded tracks land in the
    // queue even if audio_url was somehow left null.
    const { data, error } = await supabase
      .from("tracks")
      .select(`${TRACK_COLUMNS}, albums(id, slug, title, cover_image, bg_color:background_color, accent_color)`)
      .eq("is_published", true)
      .or("audio_url.not.is.null,public_audio_id.not.is.null")
      .limit(PLAYLIST_MAX);
    if (error) {
      logError(error, { caller: "queries.getPlaylistTracks" });
      return { tracks: [], isAdminCurated: false };
    }
    const rows = (data ?? []) as TrackRow[];
    const tracks = rows.map(mapTrack).filter((t) => !!t.audioUrl);
    logInfo("[queries] getPlaylistTracks", { playable: tracks.length, total: rows.length });
    return { tracks, isAdminCurated: false };
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
      logError(error, { caller: "queries.searchAlbums" });
      return [];
    }
    return ((data ?? []) as AlbumRow[]).map((row) => mapAlbum(row));
  },
  ["albums-search"],
  { revalidate: 60, tags: ["albums"] },
);

export type SearchTrack = Track & { albumSlug: string | null };

/** Search-result artist. Published artists carry full metadata so the UI can
 *  render an ArtistCard linking to /artist/<slug>. Feature-only names (no
 *  published page) carry just `name`. */
export type SearchArtist = {
  name: string;
  slug?: string;
  role?: string;
  profileImage?: string | null;
  id?: string;
};

export type SearchResult = {
  albums: Album[];
  tracks: SearchTrack[];
  artists: SearchArtist[];
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
        logError(error, { caller: "queries.searchContent albums.textSearch" });
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
        logError(error, { caller: "queries.searchContent albums.ilike" });
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
        logError(error, { caller: "queries.searchContent tracks" });
      } else if (data) {
        trackRows = data as unknown as TrackSearchRow[];
      }
    }

    // Artists: published artists table first; fall back to track-feature
    // names that don't already correspond to a published artist page.
    const artists: SearchArtist[] = [];
    const seenLower = new Set<string>();
    {
      const { data, error } = await supabase
        .from("artists")
        .select("id, slug, name, role, profile_image")
        .eq("is_published", true)
        .ilike("name", ilikeNeedle)
        .limit(SEARCH_LIMITS.artists);
      if (error) {
        logError(error, { caller: "queries.searchContent artists" });
      } else if (data) {
        for (const row of data as Array<{
          id: string;
          slug: string;
          name: string;
          role: string | null;
          profile_image: string | null;
        }>) {
          const key = row.name.toLowerCase();
          if (seenLower.has(key)) continue;
          seenLower.add(key);
          artists.push({
            id: row.id,
            slug: row.slug,
            name: row.name,
            role: row.role ?? "featured",
            profileImage: row.profile_image,
          });
          if (artists.length >= SEARCH_LIMITS.artists) break;
        }
      }
    }
    if (artists.length < SEARCH_LIMITS.artists) {
      const { data, error } = await supabase
        .from("tracks")
        .select("features")
        .eq("is_published", true)
        .not("features", "is", null)
        .limit(500);
      if (error) {
        logError(error, { caller: "queries.searchContent artists.features" });
      } else if (data) {
        const needle = query.toLowerCase();
        for (const row of data as Array<{ features: string[] | null }>) {
          if (!row.features) continue;
          for (const f of row.features) {
            if (typeof f !== "string") continue;
            const key = f.toLowerCase();
            if (seenLower.has(key)) continue;
            if (!key.includes(needle)) continue;
            seenLower.add(key);
            artists.push({ name: f });
            if (artists.length >= SEARCH_LIMITS.artists) break;
          }
          if (artists.length >= SEARCH_LIMITS.artists) break;
        }
      }
    }

    return {
      albums: albumRows.map((row) => mapAlbum(row)),
      tracks: trackRows.map((row) => {
        const albumRel = Array.isArray(row.albums) ? row.albums[0] : row.albums;
        const slug = albumRel?.slug ?? null;
        return { ...mapTrack(row), albumSlug: slug };
      }),
      artists,
    };
  },
  ["search-content"],
  { revalidate: 60, tags: ["albums", "tracks", "artists"] },
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
      logError(error, { caller: "queries.getLibraryAlbums" });
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

// ─────────────────────────────────────────────────────────────────────
// Artists
// All artist data is admin-managed. These helpers never seed defaults —
// if the artists table is empty, every consumer must render an empty
// state, not hardcoded fallback content.
// ─────────────────────────────────────────────────────────────────────

const ARTIST_COLUMNS =
  "id, slug, name, bio, role, profile_image, banner_image, location, is_featured, is_published, sort_order, spotify_url, apple_music_url, youtube_url, instagram_url, twitter_url, website_url";

type ArtistRow = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  role: ArtistRole | string | null;
  profile_image: string | null;
  banner_image: string | null;
  location: string | null;
  is_featured: boolean | null;
  is_published: boolean | null;
  sort_order: number | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  youtube_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
};

const VALID_ROLES: ArtistRole[] = [
  "primary",
  "featured",
  "producer",
  "songwriter",
  "engineer",
];

function normalizeRole(r: ArtistRole | string | null | undefined): ArtistRole {
  if (typeof r === "string" && (VALID_ROLES as string[]).includes(r)) {
    return r as ArtistRole;
  }
  return "featured";
}

function mapArtist(row: ArtistRow): Artist {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    bio: row.bio,
    role: normalizeRole(row.role),
    profileImage: row.profile_image,
    bannerImage: row.banner_image,
    location: row.location,
    isFeatured: !!row.is_featured,
    isPublished: !!row.is_published,
    sortOrder: row.sort_order ?? 0,
    spotifyUrl: row.spotify_url,
    appleMusicUrl: row.apple_music_url,
    youtubeUrl: row.youtube_url,
    instagramUrl: row.instagram_url,
    twitterUrl: row.twitter_url,
    websiteUrl: row.website_url,
  };
}

export type GetArtistsOpts = {
  published?: boolean;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

async function fetchArtists({
  published,
  featured,
  limit = 50,
  offset = 0,
}: GetArtistsOpts): Promise<ArtistListResult> {
  let q = supabase
    .from("artists")
    .select(ARTIST_COLUMNS, { count: "exact" })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);
  if (published === true) q = q.eq("is_published", true);
  if (published === false) q = q.eq("is_published", false);
  if (featured === true) q = q.eq("is_featured", true);
  const { data, count, error } = await q;
  if (error) {
    logError(error, { caller: "queries.getArtists" });
    return { artists: [], totalCount: 0, hasMore: false };
  }
  const artists = ((data ?? []) as ArtistRow[]).map(mapArtist);
  const totalCount = count ?? 0;
  return {
    artists,
    totalCount,
    hasMore: offset + artists.length < totalCount,
  };
}

export const getArtists = unstable_cache(
  async (opts: GetArtistsOpts = {}): Promise<ArtistListResult> =>
    fetchArtists(opts),
  ["artists-list"],
  { revalidate: 300, tags: ["artists"] },
);

export const getFeaturedArtists = unstable_cache(
  async (): Promise<Artist[]> => {
    const { artists } = await fetchArtists({
      published: true,
      featured: true,
      limit: 24,
    });
    return artists;
  },
  ["artists-featured"],
  { revalidate: 300, tags: ["artists"] },
);

export const getAllArtistSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from("artists")
      .select("slug")
      .eq("is_published", true);
    if (error || !data) return [];
    return (data as Array<{ slug: string }>).map((r) => r.slug);
  },
  ["artist-slugs"],
  { revalidate: 600, tags: ["artists"] },
);

type ArtistTrackJoinRow = {
  role: string | null;
  tracks: {
    id: string;
    album_id: string | null;
    title: string;
    track_number: number | null;
    duration: string | null;
    price: number | string | null;
    audio_url: string | null;
    features: string[] | null;
    is_published: boolean;
    albums: { slug: string; title: string } | { slug: string; title: string }[] | null;
  } | null;
};

type ArtistAlbumJoinRow = {
  role: string | null;
  albums: {
    id: string;
    slug: string;
    title: string;
    release_date: string | null;
    cover_image: string | null;
    background_color: string | null;
    accent_color: string | null;
    is_published: boolean;
  } | null;
};

export const getArtist = unstable_cache(
  async (slug: string): Promise<Artist | null> => {
    const { data: artistRow, error: artistErr } = await supabase
      .from("artists")
      .select(ARTIST_COLUMNS)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (artistErr || !artistRow) {
      if (artistErr) logError(artistErr, { caller: "queries.getArtist" });
      return null;
    }
    const artist = mapArtist(artistRow as ArtistRow);

    const [tracksRes, albumsRes] = await Promise.all([
      supabase
        .from("artist_tracks")
        .select(
          "role, tracks!inner(id, album_id, title, track_number, duration, price, audio_url, features, is_published, albums(slug, title))",
        )
        .eq("artist_id", artist.id),
      supabase
        .from("artist_albums")
        .select(
          "role, albums!inner(id, slug, title, release_date, cover_image, background_color, accent_color, is_published)",
        )
        .eq("artist_id", artist.id),
    ]);

    const trackRows = (tracksRes.data ?? []) as unknown as ArtistTrackJoinRow[];
    const albumRows = (albumsRes.data ?? []) as unknown as ArtistAlbumJoinRow[];

    const tracks: ArtistTrack[] = trackRows
      .filter((r) => r.tracks && r.tracks.is_published)
      .map((r) => {
        const t = r.tracks!;
        const album = Array.isArray(t.albums) ? t.albums[0] : t.albums;
        return {
          id: t.id,
          title: t.title,
          duration: t.duration ?? "0:00",
          features: t.features ?? undefined,
          audioUrl: t.audio_url ?? undefined,
          price: Number(t.price ?? 0),
          trackNumber: t.track_number ?? 0,
          albumId: t.album_id ?? "",
          albumSlug: album?.slug ?? null,
          albumTitle: album?.title ?? null,
          artistRole: r.role ?? "featured",
        };
      });

    const albums: ArtistAlbum[] = albumRows
      .filter((r) => r.albums && r.albums.is_published)
      .map((r) => {
        const a = r.albums!;
        return {
          id: a.id,
          slug: a.slug,
          title: a.title,
          releaseDate: a.release_date ?? "",
          coverImage: a.cover_image ?? "",
          bgColor: a.background_color ?? "#393838",
          accentColor: a.accent_color ?? "#3DD6C8",
          artistRole: r.role ?? "featured",
        };
      });

    return { ...artist, tracks, albums };
  },
  ["artist-by-slug"],
  { revalidate: 60, tags: ["artists"] },
);

// ─────────────────────────────────────────────────────────────────────
// Instrumentals (Sounds page). Public reads go through the
// `public_instrumentals` view which is locked to is_published=true and
// excludes vault_audio_id at the SQL layer.
// ─────────────────────────────────────────────────────────────────────

type InstrumentalRow = {
  id: string;
  album_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  type: string;
  price: number | string;
  cover_image: string | null;
  public_audio_id: string | null;
  preview_audio_id: string | null;
  audio_url: string | null;
  preview_url: string | null;
  duration: string | null;
  is_published: boolean;
  is_downloadable: boolean;
  play_count: number | null;
  download_count: number | null;
};

const INSTRUMENTAL_COLUMNS =
  "id, album_id, title, slug, description, type, price, cover_image, public_audio_id, preview_audio_id, audio_url, preview_url, duration, is_published, is_downloadable, play_count, download_count";

/** Derive the playable URLs an Instrumental exposes. Prefer Cloudinary
 *  transformations over any stored audio_url/preview_url so we always pick
 *  up f_mp3/br_128k/du_30 even if the legacy column wasn't refreshed. */
function resolveInstrumentalAudio(row: InstrumentalRow): {
  audioUrl: string | null;
  previewUrl: string | null;
} {
  const audioUrl = row.public_audio_id
    ? getInstrumentalStreamUrl(row.public_audio_id)
    : row.audio_url;
  // preview_audio_id is optional — most uploads will rely on Cloudinary
  // generating the 30s preview from the same public_audio_id.
  const previewSource = row.preview_audio_id ?? row.public_audio_id;
  const previewUrl = previewSource
    ? getInstrumentalPreviewUrl(previewSource)
    : row.preview_url;
  return {
    audioUrl: audioUrl || null,
    previewUrl: previewUrl || null,
  };
}

function mapInstrumental(row: InstrumentalRow): Instrumental {
  const { audioUrl, previewUrl } = resolveInstrumentalAudio(row);
  const type: InstrumentalType =
    row.type === "album_track" ? "album_track" : "single";
  return {
    id: row.id,
    albumId: row.album_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    type,
    price: Number(row.price ?? 0.99),
    coverImage: row.cover_image,
    publicAudioId: row.public_audio_id,
    previewAudioId: row.preview_audio_id,
    audioUrl,
    previewUrl,
    duration: row.duration,
    isPublished: row.is_published,
    isDownloadable: row.is_downloadable,
    playCount: row.play_count ?? 0,
    downloadCount: row.download_count ?? 0,
  };
}

export type GetInstrumentalsOpts = {
  page?: number;
  limit?: number;
  type?: InstrumentalType;
  albumId?: string;
};

export const getInstrumentals = unstable_cache(
  async ({
    page = 1,
    limit = 20,
    type,
    albumId,
  }: GetInstrumentalsOpts = {}): Promise<InstrumentalListResult> => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    let q = supabase
      .from("public_instrumentals")
      .select(INSTRUMENTAL_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);
    if (type) q = q.eq("type", type);
    if (albumId) q = q.eq("album_id", albumId);
    const { data, count, error } = await q;
    if (error) {
      logError(error, { caller: "queries.getInstrumentals" });
      return { instrumentals: [], totalCount: 0, hasMore: false };
    }
    const instrumentals = ((data ?? []) as InstrumentalRow[]).map(
      mapInstrumental,
    );
    const totalCount = count ?? 0;
    return {
      instrumentals,
      totalCount,
      hasMore: start + instrumentals.length < totalCount,
    };
  },
  ["instrumentals-list"],
  { revalidate: 300, tags: ["instrumentals"] },
);

export const getInstrumental = unstable_cache(
  async (slug: string): Promise<Instrumental | null> => {
    const { data, error } = await supabase
      .from("public_instrumentals")
      .select(INSTRUMENTAL_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) {
      if (error) logError(error, { caller: "queries.getInstrumental" });
      return null;
    }
    return mapInstrumental(data as InstrumentalRow);
  },
  ["instrumental-by-slug"],
  { revalidate: 60, tags: ["instrumentals"] },
);

/** Returns names of artists that have a published page, keyed by lowercase name.
 *  Used by TrackRow / AlbumDetail / search to decide whether a name should be
 *  rendered as a link (published page exists) or plain text (no page). */
export const getPublishedArtistSlugByName = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase
      .from("artists")
      .select("name, slug")
      .eq("is_published", true);
    if (error || !data) return {};
    const out: Record<string, string> = {};
    for (const row of data as Array<{ name: string; slug: string }>) {
      if (row.name && row.slug) out[row.name.toLowerCase()] = row.slug;
    }
    return out;
  },
  ["artists-slug-by-name"],
  { revalidate: 300, tags: ["artists"] },
);

export const getEPs = unstable_cache(
  async (): Promise<Album[]> => {
    return []
  },
  ['albums-eps'],
  { revalidate: 300, tags: ['albums'] },
);

export type HeroMedia = {
  id: string;
  url: string;
  mediaType: "image" | "video";
};

export const getActiveHeroMedia = unstable_cache(
  async (): Promise<HeroMedia | null> => {
    const { data, error } = await supabase
      .from("hero_media")
      .select("id, url, media_type")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      logError(error, { caller: "queries.getActiveHeroMedia" });
      return null;
    }
    if (!data) return null;
    return {
      id: (data as { id: string }).id,
      url: (data as { url: string }).url,
      mediaType: (data as { media_type: string }).media_type as "image" | "video",
    };
  },
  ["hero-media-active"],
  { revalidate: 300, tags: ["hero-media"] },
);
