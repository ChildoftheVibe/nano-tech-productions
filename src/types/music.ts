export type Album = {
  id: string;
  slug: string;
  title: string;
  description: string;
  releaseDate: string;
  coverImage: string;
  bgColor: string;
  accentColor: string;
  spotifyUrl: string;
  appleMusicUrl?: string;
  youtubeUrl?: string;
  amazonUrl?: string;
  copyright?: string;
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
};

export type AlbumListResult = {
  albums: Album[];
  totalCount: number;
  hasMore: boolean;
};
