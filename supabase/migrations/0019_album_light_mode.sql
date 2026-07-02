-- Per-album light mode. When true, the album detail page renders with a light
-- theme instead of the default dark theme. Defaults to false (dark) so every
-- existing album keeps its current appearance.
ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS light_mode BOOLEAN NOT NULL DEFAULT false;
