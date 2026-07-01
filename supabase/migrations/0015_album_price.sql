-- Add per-album price (defaults to $9.99 to match the previous hardcoded value).
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 9.99;
