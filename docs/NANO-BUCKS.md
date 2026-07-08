# Nano Bucks & Nano Tech Games

The gamification layer added on branch `nano-bucks-gamification`.

## Currency model

**Nano Bucks (NB)** is a closed-loop virtual currency: visitors **earn** it by
playing games, can **transfer** it to other wallets, **bet** it at the casino
tables, and **spend** it on track/album downloads. It is never redeemable for
cash — that keeps the system a gamification loop, not regulated gambling.

- **Wallets** are anonymous, keyed by an HMAC-signed cookie (`ntv_wallet`).
  The DB stores only `sha256(secret)`. Each wallet gets a shareable code
  (`NTV-XXXXXXXX`) for receiving transfers, and a one-time 100 NB signup bonus.
- **Ledger**: every balance movement goes through the `wallet_adjust` /
  `wallet_transfer` Postgres RPCs, which update the balance and write a
  `wallet_transactions` row atomically. Balances can never go negative
  (check constraint).
- **Game sessions**: every round is a `game_sessions` row. Casino rounds debit
  the stake at start (`/api/games/start`), optionally add stake mid-round
  (`/api/games/raise`, for double-down/call), and settle exactly once
  (`/api/games/settle` claims the row with a conditional `open → settled`
  update). Server caps the payout at the game's max multiplier; inflated
  client claims are capped and flagged in session metadata for review.
- **Arcade rewards**: portal-challenge games pay 25 NB for a win / 5 NB for
  finishing, capped at 12 rewarded rounds per wallet per UTC day.

### Known v1 limitation

Game outcomes are computed client-side and validated server-side only by
payout caps + rate limits + the daily arcade cap. Because NB is a closed
currency (worth at most a free MP3), this is an accepted trade-off. If NB ever
gains real-world value, move dealing/RNG server-side first.

## Portal challenge

After the enter-portal fly-through, `PortalGameGate` presents one of six
arcade games at random: **Checkers, Tetra Vault (falling blocks), Vault Runner
(platformer stage), Star Vanguard (fixed shooter), Minesweeper, Tank Wars**.
Winning pays NB; a skip link and Escape always let the visitor through to the
album (accessibility + purchase funnel). The Mario/Galaga/Tetris-style games
are original implementations with original names to avoid trademark issues.

## Nano Tech Games (`/games`)

Casino floor (all stake NB): Blackjack, Roulette (European), Craps (pass
line), Texas Hold'em (heads-up vs house), Nano Slots, Pokeno, **Casino Wild**
(original UNO-style shedding game — ante to sit, going out pays 2× plus 0.75×
per card left in the house's hand, capped 8×), Casino Dominoes (block game —
out pays 2×, pip win 3×), Video Poker (9/6 Jacks or Better), Card Flip Duel,
3-Card Monte. Plus the free arcade cabinet and a wallet-to-wallet transfer
panel. Game odds use standard casino paytables (slight house edge) so NB
recirculates toward album redemptions.

## NB pricing

- `albums.nb_price` / `tracks.nb_price` (bigint, null = not redeemable),
  set from the admin Album/Track forms.
- Album page shows the USD Buy pill and an NB redeem pill side by side; the
  track row menu shows Buy · $ and Redeem · NB.
- `/api/wallet/redeem` re-reads the NB price from the DB, debits the wallet,
  and mints the same single-use `download_tokens` a PayPal purchase would.
  Token-mint failure auto-refunds.

## Agent platform

Seven cron-driven agents (`/api/cron/agents/[agent]`, Bearer `CRON_SECRET`,
schedules in `vercel.json`, implementations in `src/lib/agents/`):

| Agent | Schedule | What it does |
|---|---|---|
| `ui-research` | Mon 06:00 | Researches casino-UI best practice, writes a finding + theme proposal to `agent_findings` |
| `ui-implementer` | Mon 07:00 | Applies the oldest unapplied finding to `game_ui_config` (sanitized whitelist), which `GameShell` reads live — findings roll out without a deploy |
| `quorvo-growth` | Mon 08:00 | Weekly audience analysis from `analytics_geo`/`analytics_events` + top tracks → marketing recommendations in `agent_findings` |
| `listener` | daily 04:00 | Builds a sound profile per track (metadata + lyrics analysis) → `track_profiles` (5 tracks/run) |
| `similar-artists` | daily 04:30 | Turns profiles into comparable-artist lists (LLM + Spotify artist lookup) → `similar_artists` |
| `link-populator` | daily 05:00 | Fills `tracks.external_links` with Spotify (resolved), Apple/YouTube search links, and a canonical vault link |
| `spotify-playlists` | Fri 10:00 | Creates a public "NTV Vault Radio" playlist mixing catalog tracks (resolved Spotify URIs) with similar artists; the description links back to the platform |

All agents are idempotent, skip gracefully when their env vars are missing,
and audit-log every run.

### Required env

- `ANTHROPIC_API_KEY` (+ optional `AGENT_MODEL`, default `claude-sonnet-5`)
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` — search/link agents
- `SPOTIFY_REFRESH_TOKEN` — playlist agent (one-time OAuth grant with
  `playlist-modify-public`; any standard Spotify token-generator flow works)
- `CRON_SECRET` — already required by existing crons

### Note on the "listener" agent

It cannot literally audit audio; it profiles tracks from title, features,
credits, album context and full lyrics. If deeper analysis is wanted later,
feed Cloudinary-hosted MP3s through an audio-analysis API and merge the
result into `track_profiles.profile`.

## Migration

`supabase/migrations/0023_nano_bucks.sql` — apply with the usual Supabase
migration flow before deploying this branch.
