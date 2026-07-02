export type Album = {
  id: string;
  slug: string;
  title: string;
  description: string;
  releaseDate: string;
  coverImage: string;
  /** Up to 4 short (5-7s) looping videos shown in the cover carousel. */
  coverVideos?: string[];
  bgColor: string;
  accentColor: string;
  spotifyUrl: string;
  appleMusicUrl?: string;
  youtubeUrl?: string;
  amazonUrl?: string;
  streaming_links?: Record<string, string>;
  album_type?: 'album' | 'ep' | 'single';
  copyright?: string;
  price?: number;
  tracks: Track[];
};

export type TrackCredits = {
  produced_by?: string[];
  arranged_by?: string[];
  lead_vocals?: string[];
  written_by?: string[];
  background_vocals?: string[];
  drums?: string[];
  percussion?: string[];
  mixing_engineer?: string[];
  mastering_engineer?: string[];
  artwork?: string[];
  lyrics?: string[];
};

export type Track = {
  id: string;
  albumId: string;
  title: string;
  trackNumber: number;
  duration: string;
  price: number;
  features?: string[];
  audioUrl?: string;
  credits: TrackCredits;
  lyrics: string | null;
  has_lyrics: boolean;
  // Embedded album metadata — populated by the playlist query (album join).
  // Undefined on tracks fetched as part of a full Album query.
  albumCoverImage?: string | null;
  albumBgColor?: string | null;
  albumAccentColor?: string | null;
  albumSlug?: string | null;
  albumTitle?: string | null;
};

export type AlbumListResult = {
  albums: Album[];
  totalCount: number;
  hasMore: boolean;
};

export type ArtistRole =
  | "primary"
  | "featured"
  | "producer"
  | "songwriter"
  | "engineer";

/** Lightweight track row attached to an Artist (includes album slug/title so
 *  the artist page can render context without a second fetch). */
export type ArtistTrack = {
  id: string;
  title: string;
  duration: string;
  features?: string[];
  audioUrl?: string;
  price: number;
  trackNumber: number;
  albumId: string;
  albumSlug: string | null;
  albumTitle: string | null;
  /** Album art/theme so the player can swap cover + accent when played. */
  albumCoverImage?: string | null;
  albumBgColor?: string | null;
  albumAccentColor?: string | null;
  /** Role of this artist on this track (from artist_tracks.role). */
  artistRole: string;
};

export type ArtistAlbum = {
  id: string;
  slug: string;
  title: string;
  releaseDate: string;
  coverImage: string;
  bgColor: string;
  accentColor: string;
  /** Role of this artist on this album (from artist_albums.role). */
  artistRole: string;
};

export type Artist = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  role: ArtistRole;
  profileImage: string | null;
  bannerImage: string | null;
  location: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  tracks?: ArtistTrack[];
  albums?: ArtistAlbum[];
};

export type ArtistListResult = {
  artists: Artist[];
  totalCount: number;
  hasMore: boolean;
};

export type InstrumentalType = "single" | "album_track";

export type Instrumental = {
  id: string;
  albumId: string | null;
  title: string;
  slug: string;
  description: string | null;
  type: InstrumentalType;
  price: number;
  coverImage: string | null;
  publicAudioId: string | null;
  previewAudioId: string | null;
  audioUrl: string | null;
  previewUrl: string | null;
  duration: string | null;
  isPublished: boolean;
  isDownloadable: boolean;
  playCount: number;
  downloadCount: number;
};

export type InstrumentalListResult = {
  instrumentals: Instrumental[];
  totalCount: number;
  hasMore: boolean;
};
