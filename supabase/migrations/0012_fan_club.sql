-- ============================================================
-- 0012_fan_club.sql — Nano Techians Fan Club
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. fan_club_members
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fan_club_members (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT NOT NULL DEFAULT '',
  avatar_url       TEXT,
  membership_tier  TEXT NOT NULL DEFAULT 'standard'
                     CHECK (membership_tier IN ('standard', 'vip', 'founding')),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ
);

ALTER TABLE fan_club_members ENABLE ROW LEVEL SECURITY;

-- Members can read their own row
CREATE POLICY "fan_club_members_select_own"
  ON fan_club_members
  FOR SELECT
  USING (auth.uid() = id);

-- Members can update their own row, but cannot change tier or is_active
CREATE POLICY "fan_club_members_update_own"
  ON fan_club_members
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-promotion of tier
    AND membership_tier = (
      SELECT membership_tier FROM fan_club_members WHERE id = auth.uid()
    )
    -- Prevent self-deactivation / reactivation
    AND is_active = (
      SELECT is_active FROM fan_club_members WHERE id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 2. Auto-create member record when a new auth user is created
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _ntv_create_fan_club_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  -- Prefer full_name, fall back to name, then email prefix
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO fan_club_members (id, display_name)
  VALUES (NEW.id, v_display_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ntv_fan_club_on_user_created ON auth.users;
CREATE TRIGGER ntv_fan_club_on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION _ntv_create_fan_club_member();

-- ────────────────────────────────────────────────────────────
-- 3. fan_club_content — exclusive content catalog
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fan_club_content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('track', 'video', 'artwork')),
  title        TEXT NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  media_url    TEXT,
  track_id     UUID REFERENCES tracks(id) ON DELETE SET NULL,
  album_id     UUID REFERENCES albums(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fan_club_content ENABLE ROW LEVEL SECURITY;

-- Only active members can read published content
CREATE POLICY "fan_club_content_select_active_members"
  ON fan_club_content
  FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM fan_club_members
      WHERE id = auth.uid()
        AND is_active = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. fan_club_audit — append-only audit log
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fan_club_audit (
  id         BIGSERIAL PRIMARY KEY,
  member_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fan_club_audit ENABLE ROW LEVEL SECURITY;

-- No user-facing SELECT or INSERT policies — only service role can write/read.
-- Enforce append-only: block all UPDATE and DELETE from the application layer.
CREATE POLICY "fan_club_audit_no_update"
  ON fan_club_audit
  FOR UPDATE
  USING (false);

CREATE POLICY "fan_club_audit_no_delete"
  ON fan_club_audit
  FOR DELETE
  USING (false);
