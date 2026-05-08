-- Add copyright metadata to albums.
ALTER TABLE albums ADD COLUMN IF NOT EXISTS copyright TEXT
  DEFAULT '© Nano Tech Productions. All rights reserved.';
