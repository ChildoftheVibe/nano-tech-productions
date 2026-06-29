-- 0014_featured_albums.sql
-- Admin-curated list of albums shown in the Featured section on the home page.
-- Mirrors the `playlist` table pattern: position controls display order,
-- is_active lets the admin hide an entry without deleting it.

CREATE TABLE featured_albums (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id   uuid        NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  position   integer,
  is_active  boolean     NOT NULL DEFAULT true,
  added_at   timestamptz DEFAULT now(),
  UNIQUE (album_id)
);

CREATE INDEX featured_albums_position_idx ON featured_albums (position);

ALTER TABLE featured_albums ENABLE ROW LEVEL SECURITY;

-- Public can read (home page uses the anon key to power getFeaturedAlbums).
CREATE POLICY "featured_albums_public_read"
  ON featured_albums FOR SELECT
  USING (true);

-- Writes are done exclusively via the service-role key in API routes.
