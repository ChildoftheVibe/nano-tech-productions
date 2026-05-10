-- ─────────────────────────────────────────────────────────────────────
-- Track-level lyrics + production credits.
-- credits is a JSONB blob keyed by role; each role is an array of names.
-- has_lyrics is a separate flag so the player can decide whether to show
-- the BookOpenIcon trigger without paying for lyrics text on every query.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS credits JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lyrics TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_lyrics BOOLEAN DEFAULT false;

-- Keep public_tracks view aligned. Lyrics + credits are part of the
-- published-track payload (album page renders credits, player renders
-- lyrics on demand for tracks where has_lyrics = true).
CREATE OR REPLACE VIEW public_tracks AS
  SELECT
    id, album_id, title, track_number, duration,
    price, is_downloadable, is_published, features,
    play_count, public_audio_id,
    credits, lyrics, has_lyrics,
    created_at
  FROM tracks
  WHERE is_published = true;
