-- Add album_type column to albums table
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS album_type TEXT
  NOT NULL DEFAULT 'album'
  CHECK (album_type IN ('album', 'ep', 'single'));

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_albums_type
  ON albums(album_type);

-- Update any existing NULL values just in case
UPDATE albums SET album_type = 'album'
  WHERE album_type IS NULL;
