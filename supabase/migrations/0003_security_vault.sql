-- ─────────────────────────────────────────────────────────────────────
-- Two-bucket audio model. Public id streams MP3 320; vault id is WAV.
-- vault_audio_id is NEVER selected by public queries — defense in depth
-- via the public_tracks view, app-layer column allowlist, and RLS.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS public_audio_id TEXT,
  ADD COLUMN IF NOT EXISTS vault_audio_id TEXT,
  ADD COLUMN IF NOT EXISTS wav_checksum TEXT,
  ADD COLUMN IF NOT EXISTS wav_file_size_mb DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

CREATE OR REPLACE VIEW public_tracks AS
  SELECT
    id, album_id, title, track_number, duration,
    price, is_downloadable, is_published, features,
    play_count, public_audio_id, created_at
  FROM tracks
  WHERE is_published = true;

-- Tighten the existing public read so anon/authenticated cannot read vault
-- columns. Service-role bypasses RLS by design and is only used server-side.
DROP POLICY IF EXISTS "Public read published tracks" ON tracks;
CREATE POLICY "Public read non-vault tracks" ON tracks
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- ─────────────────────────────────────────────────────────────────────
-- Audit log — every sensitive action lands here.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  performed_by TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit_log(performed_by);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No public access to audit log" ON audit_log;
CREATE POLICY "No public access to audit log" ON audit_log
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────
-- Single-use download tokens for purchased MP3s.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS download_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  order_id UUID REFERENCES orders(id),
  track_id UUID REFERENCES tracks(id),
  format TEXT NOT NULL DEFAULT 'mp3_320',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '2 hours',
  used_at TIMESTAMPTZ,
  is_used BOOLEAN DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires ON download_tokens(expires_at);

ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only download tokens" ON download_tokens;
CREATE POLICY "Service role only download tokens" ON download_tokens
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────
-- Rate limiting state.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  UNIQUE(identifier, action)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only rate limits" ON rate_limits;
CREATE POLICY "Service role only rate limits" ON rate_limits
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────
-- Admin sessions — bcrypt-backed tokens replace plaintext password cookies.
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '8 hours',
  ip_address TEXT,
  is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only sessions" ON admin_sessions;
CREATE POLICY "Service role only sessions" ON admin_sessions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────
-- Atomic rate-limit check used by middleware and login route.
-- Returns true if the request is allowed; false if blocked.
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_download_count(track_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE tracks SET download_count = COALESCE(download_count, 0) + 1 WHERE id = track_id;
$$;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_attempts INTEGER;
  v_blocked TIMESTAMPTZ;
  v_window_start TIMESTAMPTZ;
BEGIN
  SELECT attempts, blocked_until, window_start
    INTO v_attempts, v_blocked, v_window_start
  FROM rate_limits
  WHERE identifier = p_identifier AND action = p_action;

  IF v_blocked IS NOT NULL AND v_blocked > NOW() THEN
    RETURN FALSE;
  END IF;

  -- Window expired → reset counter.
  IF v_window_start IS NOT NULL
     AND v_window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
    UPDATE rate_limits
       SET attempts = 1,
           window_start = NOW(),
           blocked_until = NULL
     WHERE identifier = p_identifier AND action = p_action;
    RETURN TRUE;
  END IF;

  IF v_attempts IS NOT NULL AND v_attempts >= p_max_attempts THEN
    UPDATE rate_limits
       SET blocked_until = NOW() + (p_window_minutes || ' minutes')::INTERVAL
     WHERE identifier = p_identifier AND action = p_action;
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limits (identifier, action, attempts, window_start)
  VALUES (p_identifier, p_action, 1, NOW())
  ON CONFLICT (identifier, action) DO UPDATE
    SET attempts = rate_limits.attempts + 1;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
