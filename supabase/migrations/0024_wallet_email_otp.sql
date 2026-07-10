-- Email verification for wallet "login" (claiming a wallet with an email).
-- One-time 6-digit codes, hashed at rest, short-lived, single-use.

create table if not exists wallet_email_otps (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wallet_email_otps_wallet_idx
  on wallet_email_otps (wallet_id, email, created_at desc);

-- Service-role only; all access goes through API routes (matches wallets/wallet_transactions).
alter table wallet_email_otps enable row level security;
