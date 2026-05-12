-- Instrumentals catalog. Mirrors the tracks model (public streaming + vault
-- master + per-row download tokens) but lives in its own table so the
-- sounds-page surface stays independent of the album playlist queue.
--
-- vault_audio_id is NEVER selected by public queries. The public_instrumentals
-- view below enforces this at the SQL layer in addition to the application
-- code.

CREATE TABLE IF NOT EXISTS instrumentals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'single'
    CHECK (type IN ('single', 'album_track')),
  price DECIMAL(10,2) DEFAULT 0.99,
  cover_image TEXT,
  public_audio_id TEXT,
  vault_audio_id TEXT,
  preview_audio_id TEXT,
  audio_url TEXT,
  preview_url TEXT,
  duration TEXT,
  is_published BOOLEAN DEFAULT false,
  is_downloadable BOOLEAN DEFAULT true,
  play_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instrumental_download_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL
    DEFAULT encode(gen_random_bytes(32), 'hex'),
  order_id UUID REFERENCES orders(id),
  instrumental_id UUID REFERENCES instrumentals(id),
  format TEXT DEFAULT 'mp3_320',
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours',
  used_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE instrumentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrumental_download_tokens
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published instrumentals"
  ON instrumentals FOR SELECT USING (is_published = true);
CREATE POLICY "Service role instrumentals"
  ON instrumentals USING (auth.role() = 'service_role');
CREATE POLICY "Service role instrumental tokens"
  ON instrumental_download_tokens
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_instrumentals_published
  ON instrumentals(is_published);
CREATE INDEX IF NOT EXISTS idx_instrumentals_album
  ON instrumentals(album_id);
CREATE INDEX IF NOT EXISTS idx_instrumentals_type
  ON instrumentals(type);
CREATE INDEX IF NOT EXISTS idx_instrumental_tokens_token
  ON instrumental_download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_instrumental_tokens_order
  ON instrumental_download_tokens(order_id);

-- Public-facing view: omits vault_audio_id and limits to published rows so
-- the column can never leak through a query mistake. Application code uses
-- this view for /sounds page reads.
CREATE OR REPLACE VIEW public_instrumentals AS
  SELECT id, album_id, title, slug, description, type,
    price, cover_image, public_audio_id, preview_audio_id,
    audio_url, preview_url, duration, is_published,
    is_downloadable, play_count, download_count, created_at
  FROM instrumentals
  WHERE is_published = true;
