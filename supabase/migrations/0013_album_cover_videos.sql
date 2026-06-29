-- 0013_album_cover_videos.sql
-- Add looping cover videos to albums. Each album keeps its static cover image
-- as the first slide; up to 4 short (5-7s) videos can be attached and loop in
-- an auto-advancing carousel on the album view. Stored as a JSON array of
-- Cloudinary public IDs (or full URLs), mirroring how cover_image is stored.

ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS cover_videos jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE albums
  DROP CONSTRAINT IF EXISTS albums_cover_videos_max4;
ALTER TABLE albums
  ADD CONSTRAINT albums_cover_videos_max4
  CHECK (jsonb_typeof(cover_videos) = 'array' AND jsonb_array_length(cover_videos) <= 4);
