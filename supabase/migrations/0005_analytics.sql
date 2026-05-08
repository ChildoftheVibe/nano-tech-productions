-- ─────────────────────────────────────────────────────────────────────
-- First-party analytics tables. Mirrors the highest-value events PostHog
-- captures so the admin dashboard renders without hitting an external API.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  page_views INTEGER DEFAULT 0,
  total_listen_seconds INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_country ON analytics_sessions(country);
CREATE INDEX IF NOT EXISTS idx_sessions_first_seen ON analytics_sessions(first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON analytics_sessions(session_id);

ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only sessions analytics" ON analytics_sessions;
CREATE POLICY "Service role only sessions analytics" ON analytics_sessions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────
-- Event log: every play_start, play_progress (10s ticks), skip, complete,
-- pause, seek, album_view, search, purchase_intent.
-- We keep these granular so the admin dashboard can compute average skip
-- points, completion rates, and trends without external joins.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  position_seconds NUMERIC(10,2),
  duration_seconds NUMERIC(10,2),
  percent NUMERIC(5,2),
  query TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type_created ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_track ON analytics_events(track_id) WHERE track_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_album ON analytics_events(album_id) WHERE album_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only events analytics" ON analytics_events;
CREATE POLICY "Service role only events analytics" ON analytics_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Atomic increment helper for session listen totals.
CREATE OR REPLACE FUNCTION increment_listen_seconds(
  p_session_id TEXT,
  p_seconds INTEGER
) RETURNS void
LANGUAGE sql
AS $$
  UPDATE analytics_sessions
     SET total_listen_seconds = COALESCE(total_listen_seconds, 0) + p_seconds,
         last_seen = NOW()
   WHERE session_id = p_session_id;
$$;
