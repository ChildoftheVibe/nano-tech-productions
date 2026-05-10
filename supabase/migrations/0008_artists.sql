-- ─────────────────────────────────────────────────────────────────────
-- Fully dynamic artist system. Admin controls who is published, who is
-- featured, and every artist page. Zero artists are hardcoded.
-- artist_tracks / artist_albums are the join tables. They are independent
-- of tracks.features so legacy feature-name strings still surface in
-- search, but the canonical source of truth for an artist's page is this
-- table.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  role TEXT DEFAULT 'featured'
    CHECK (role IN ('primary', 'featured', 'producer',
                    'songwriter', 'engineer')),
  profile_image TEXT,
  banner_image TEXT,
  location TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  spotify_url TEXT,
  apple_music_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'featured',
  UNIQUE(artist_id, track_id)
);

CREATE TABLE IF NOT EXISTS artist_albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'featured',
  UNIQUE(artist_id, album_id)
);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published artists" ON artists
  FOR SELECT USING (is_published = true);
CREATE POLICY "Public read artist_tracks" ON artist_tracks
  FOR SELECT USING (true);
CREATE POLICY "Public read artist_albums" ON artist_albums
  FOR SELECT USING (true);
CREATE POLICY "Service role artists" ON artists
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role artist_tracks" ON artist_tracks
  USING (auth.role() = 'service_role');
CREATE POLICY "Service role artist_albums" ON artist_albums
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);
CREATE INDEX IF NOT EXISTS idx_artists_published
  ON artists(is_published);
CREATE INDEX IF NOT EXISTS idx_artists_featured
  ON artists(is_featured);
CREATE INDEX IF NOT EXISTS idx_artist_tracks_artist
  ON artist_tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_tracks_track
  ON artist_tracks(track_id);
