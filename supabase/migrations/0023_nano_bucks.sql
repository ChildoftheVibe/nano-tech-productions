-- Nano Bucks: closed-loop virtual currency + gamification platform.
-- Wallets are anonymous (cookie-keyed) until the visitor claims one with an
-- email. All balance movement goes through the wallet_adjust / wallet_transfer
-- RPCs so the ledger and balance can never drift apart.

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  -- SHA-256 hash of the secret stored in the visitor's HMAC-signed cookie.
  wallet_key_hash text not null unique,
  -- Short human-shareable code used to receive transfers ("NTV-XXXXXX").
  wallet_code text not null unique,
  display_name text,
  email text,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallets_code_idx on wallets (wallet_code);

create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  -- Positive = credit, negative = debit.
  amount bigint not null,
  balance_after bigint not null,
  -- earn_game | bet_stake | bet_payout | transfer_in | transfer_out |
  -- redeem_track | redeem_album | bonus | admin_adjust
  tx_type text not null,
  ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_tx_wallet_idx
  on wallet_transactions (wallet_id, created_at desc);

-- One row per game round. Casino rounds debit the stake at start and credit
-- the payout at settle; arcade (portal) rounds have stake 0 and a fixed
-- reward. The signed session id is what the client must present to settle,
-- and a session can be settled exactly once.
create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  game_id text not null,
  mode text not null check (mode in ('arcade', 'casino')),
  stake bigint not null default 0 check (stake >= 0),
  payout bigint,
  status text not null default 'open' check (status in ('open', 'settled', 'expired')),
  -- Server-generated seed revealed at settle time (provably-fair audits).
  server_seed text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists game_sessions_wallet_idx
  on game_sessions (wallet_id, created_at desc);

-- Nano Bucks prices alongside USD prices.
alter table albums add column if not exists nb_price bigint;
alter table tracks add column if not exists nb_price bigint;

-- Per-track external streaming links, populated by the link-populator agent.
alter table tracks add column if not exists external_links jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Agent platform tables
-- ---------------------------------------------------------------------------

-- Findings produced by research agents (casino UI research, growth research).
create table if not exists agent_findings (
  id uuid primary key default gen_random_uuid(),
  agent text not null,               -- ui-research | quorvo-growth | ...
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'applied', 'dismissed')),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create index if not exists agent_findings_agent_idx on agent_findings (agent, status, created_at desc);

-- Live UI theme config the ui-implementer agent writes and GameShell reads.
create table if not exists game_ui_config (
  id int primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);

insert into game_ui_config (id, config) values (1, '{}'::jsonb)
  on conflict (id) do nothing;

-- Sound profiles produced by the listener agent (per-track analysis).
create table if not exists track_profiles (
  track_id uuid primary key references tracks(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,   -- genre, mood, tempo, tags…
  analyzed_at timestamptz not null default now()
);

-- Similar-artist results produced by the similar-artist agent.
create table if not exists similar_artists (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id) on delete cascade,
  artist_name text not null,
  spotify_artist_id text,
  reason text,
  score numeric,
  created_at timestamptz not null default now()
);

create index if not exists similar_artists_track_idx on similar_artists (track_id);

-- Spotify playlists created by the playlist agent.
create table if not exists agent_playlists (
  id uuid primary key default gen_random_uuid(),
  spotify_playlist_id text not null unique,
  name text not null,
  description text,
  track_ids uuid[] not null default '{}',
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RPCs — atomic balance movement
-- ---------------------------------------------------------------------------

-- Adjust a wallet balance and write the ledger row in one transaction.
-- Raises on insufficient funds (balance check constraint).
create or replace function wallet_adjust(
  p_wallet_id uuid,
  p_amount bigint,
  p_tx_type text,
  p_ref text default null,
  p_metadata jsonb default '{}'::jsonb
) returns bigint
language plpgsql
security definer
as $$
declare
  v_balance bigint;
begin
  update wallets
     set balance = balance + p_amount,
         lifetime_earned = lifetime_earned + greatest(p_amount, 0),
         updated_at = now()
   where id = p_wallet_id
   returning balance into v_balance;

  if v_balance is null then
    raise exception 'wallet_not_found';
  end if;

  insert into wallet_transactions (wallet_id, amount, balance_after, tx_type, ref, metadata)
  values (p_wallet_id, p_amount, v_balance, p_tx_type, p_ref, p_metadata);

  return v_balance;
end;
$$;

-- Transfer between two wallets atomically (share/trade/tip).
create or replace function wallet_transfer(
  p_from uuid,
  p_to uuid,
  p_amount bigint,
  p_note text default null
) returns void
language plpgsql
security definer
as $$
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;
  if p_from = p_to then
    raise exception 'self_transfer';
  end if;
  perform wallet_adjust(p_from, -p_amount, 'transfer_out', p_to::text,
                        jsonb_build_object('note', p_note));
  perform wallet_adjust(p_to, p_amount, 'transfer_in', p_from::text,
                        jsonb_build_object('note', p_note));
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS — everything is service-role only; all access goes through API routes.
-- ---------------------------------------------------------------------------

alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table game_sessions enable row level security;
alter table agent_findings enable row level security;
alter table game_ui_config enable row level security;
alter table track_profiles enable row level security;
alter table similar_artists enable row level security;
alter table agent_playlists enable row level security;

-- Public may read the live game UI config (games fetch it client-side).
create policy game_ui_config_public_read on game_ui_config
  for select using (true);
