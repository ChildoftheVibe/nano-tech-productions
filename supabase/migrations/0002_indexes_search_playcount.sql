-- Indexes for query performance at scale.
CREATE INDEX IF NOT EXISTS idx_albums_slug ON albums(slug);
CREATE INDEX IF NOT EXISTS idx_albums_published ON albums(is_published);
CREATE INDEX IF NOT EXISTS idx_albums_release_date ON albums(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_published ON tracks(is_published);
CREATE INDEX IF NOT EXISTS idx_tracks_audio_url ON tracks(audio_url) WHERE audio_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_playlist_active ON playlist(is_active) WHERE is_active = true;

-- Generated full-text search column for albums.
ALTER TABLE albums ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_albums_search ON albums USING GIN(search_vector);

-- Per-track play count (fire-and-forget incremented from /api/tracks/played).
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;

-- Atomic increment helper called via PostgREST rpc().
CREATE OR REPLACE FUNCTION increment_play_count(track_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE tracks SET play_count = COALESCE(play_count, 0) + 1 WHERE id = track_id;
$$;
