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

export type Track = {
  id: string;
  albumId: string;
  title: string;
  trackNumber: number;
  duration: string;
  price: number;
  features?: string[];
  audioUrl?: string;
};

export type AlbumListResult = {
  albums: Album[];
  totalCount: number;
  hasMore: boolean;
};
