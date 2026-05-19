-- Admin WebAuthn / Passkey credentials for biometric login.
-- Only the service role (admin API) can read or write these rows.

CREATE TABLE admin_webauthn_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id   TEXT UNIQUE NOT NULL,
  public_key      TEXT NOT NULL,         -- base64url-encoded COSE key
  counter         BIGINT NOT NULL DEFAULT 0,
  device_type     TEXT,                  -- 'singleDevice' | 'multiDevice'
  backed_up       BOOLEAN NOT NULL DEFAULT FALSE,
  transports      TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Only the service role (used by supabaseAdmin) may access this table.
CREATE POLICY "service_role_only"
  ON admin_webauthn_credentials
  TO service_role
  USING (true)
  WITH CHECK (true);
