export type Album = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  release_date: string | null;
  cover_image: string | null;
  cover_videos: string[];
  background_color: string;
  accent_color: string;
  spotify_url: string | null;
  apple_music_url: string | null;
  youtube_url: string | null;
  amazon_url: string | null;
  copyright: string | null;
  price: number;
  nb_price: number | null;
  is_published: boolean;
  album_type?: 'album' | 'ep' | 'single';
  light_mode: boolean;
  created_at: string;
  updated_at: string;
};

export type AlbumInput = Partial<
  Omit<Album, "id" | "created_at" | "updated_at">
>;

import type { TrackCredits } from "@/types/music";

export type Track = {
  id: string;
  album_id: string | null;
  title: string;
  track_number: number | null;
  duration: string | null;
  price: number;
  nb_price: number | null;
  audio_url: string | null;
  public_audio_id: string | null;
  vault_audio_id: string | null;
  wav_checksum: string | null;
  wav_file_size_mb: number | null;
  download_count: number;
  play_count: number;
  is_downloadable: boolean;
  is_published: boolean;
  features: string[] | null;
  credits: TrackCredits;
  lyrics: string | null;
  has_lyrics: boolean;
  created_at: string;
};

export type TrackInput = Partial<Omit<Track, "id" | "created_at">>;

export type Instrumental = {
  id: string;
  album_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  type: "single" | "album_track";
  price: number;
  cover_image: string | null;
  public_audio_id: string | null;
  vault_audio_id: string | null;
  preview_audio_id: string | null;
  audio_url: string | null;
  preview_url: string | null;
  duration: string | null;
  is_published: boolean;
  is_downloadable: boolean;
  play_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
};

export type InstrumentalInput = Partial<
  Omit<Instrumental, "id" | "created_at" | "updated_at">
>;

export type DiscountAppliesTo = "single" | "album" | "all";

export type DiscountCode = {
  id: string;
  code: string;
  discount_percent: number;
  applies_to: DiscountAppliesTo;
  album_id: string | null;
  expires_at: string;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
};

export type DiscountInput = Partial<
  Omit<DiscountCode, "id" | "current_uses" | "created_at">
>;
