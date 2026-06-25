# Claude Context — NTV Vault

> Loaded alongside `CLAUDE.md` at the start of every session. Contains evolving
> project state: recent decisions, open work items, discovered gotchas, and
> patterns that aren't obvious from the code alone. Update this file whenever
> something materially changes.

---

## How to Use This File

Read `CLAUDE.md` first for the stable knowledge base (schema, routes, design
system, security rules). Read this file for the *current* state of the project
— what changed recently, what's still open, and what trips you up.

---

## Current Project State (as of 2026-06-25)

### Recent Changes

| Session | Change |
|---------|--------|
| 2026-06-25 | **2027 UI redesign (desktop + player)**. Full sidebar restyle, album view accent theming, tracklist overhaul, desktop Now Playing screen, PlayerBar polish, Now Playing button in TopBar. See "2027 Design Refresh" below. |
| 2026-06-25 | **Player queue fixes**: seed now promotes first track *with album cover* to `currentTrack`; `TapToStartBanner` syncs `store.setPlaying(true)` when audio starts so PlayerBar reflects playing state. |
| 2026-06-23 | **Security: C1/H5/H6/H7/C3 implemented**. CSRF double-submit cookie on all admin mutations, PayPal IP allowlist in live mode, order nonce validation, session IP binding, real cron security-check. See "Fixed This Session" below. |
| 2026-06-22 | Font: All `h1–h6` now use **Bungee** (next/font/google, CSS var `--font-bungee`). Set in `src/app/layout.tsx` and `src/styles/globals.css`. |

### Last Commit
`b459661` — fix: show album art and accent color on first play at page load  
*(current session not yet committed as of this update)*

---

## 2027 Design Refresh (2026-06-25)

All changes below are live in `main`. Source of truth remains `2027DESIGN.md`.

- **Sidebar** — Darker `#0d1514` bg, teal left-border active state, removed album list, TopBar fan club button replaced with user avatar.
- **Album view** — Two-column layout (cover + info left, tracklist right). Per-album `accentColor` used for track row highlight, Bungee "TRACKLIST" heading, accent-coloured play buttons.
- **Tracklist rows** — Flat strip highlight (no card radius), two-line layout (title + artist), larger font and row height.
- **Desktop Now Playing** — Full-screen overlay (`FullScreenPlayer`). Opened via "Now Playing" button in TopBar. Accent-coloured gradient background, centered album art, waveform, lyrics modal, queue drawer.
- **PlayerBar** — Accent-coloured play button, rectangular transport controls, click track-info area opens Now Playing.
- **Queue** — Vault-only tracks (no `audioUrl`) excluded from the public shuffle queue. Queue list items are clickable (jump-to-track).
- **Home page** — Weekly Selections section (playlist tracks), centered Now Playing section.
- **Sounds / Artists / Library** — Bungee headings, matching dark aesthetic.
- **Admin** — Track filter sync fix, sticky save button on scroll, pill-style buttons.

---

## Security Posture

Full audit document: `SECURITY.md` (untracked, load when working on API/auth/payments).

### Fixed This Session
- **C1** CSRF: double-submit cookie set on `/api/admin/auth/login`. Every admin mutation validates `x-csrf-token` header via new `validateCsrf()` in `src/lib/auth.ts`. Client utility `adminFetch()` in `src/lib/adminFetch.ts` sends header automatically.
- **C3** Cron security-check: now runs real audit_log queries, anomaly detection (IP changes, rapid failures), and execution logging. `/api/cron/backup` still TODO.
- **H5** PayPal IP allowlist: webhook rejects requests outside PayPal CIDR ranges in live mode (uses `requestIp` middleware).
- **H6** Order nonce: `/api/paypal/create-order` sets HMAC-signed `ntv-co-nonce` cookie. `/api/paypal/verify` validates and clears before minting tokens.
- **H7** Session IP binding: `verifySessionToken()` now compares stored IP to current request IP. `isAdmin()` extracts IP from `x-forwarded-for` or `cf-connecting-ip` headers.
- **C2** Cron secret comparison is now timing-safe (`crypto.timingSafeEqual`)
- **H1** Discount validation endpoint has rate limiting (10/min, strict)
- **H2** Analytics endpoints have rate limiting (120/min events, 10/5min geo)
- **H3** WebAuthn auth-options + auth-verify have rate limiting (5/15min, strict)
- **H4** Admin CRUD audit logs: albums, tracks, discounts now emit `logAuditEvent` on create/update/delete (artists already had them)
- **M2** Admin discount POST validates `discount_percent` (1–100), `expires_at` (future), `max_uses` (positive int)
- **Bug** Analytics routes returned raw Supabase `error.message` — now `"internal_error"`
- **Bug** WAV stream route logged `trackId` before auth check — moved to after `isAdmin()`
- **Bug** Removed console.log of audio field payload from TrackForm (security violation)

### Still Open (Not Fixed — Requires Planning)
| ID | Issue | Notes |
|----|-------|-------|
| C4 | `ADMIN_PASSWORD_HASH` in env var | Architectural: move to DB row in `admin_sessions` table. |
| M1 | `unsafe-eval` + `unsafe-inline` in CSP | Requires per-request nonce middleware. PayPal SDK may require `unsafe-eval` — audit first. |
| M8 | Download token expiry too long | Default 2 hours; consider reducing for WAV vault access (max 15 min recommended). |

---

## Architecture Gotchas

### Next.js Version
This is **Next.js 16.2.6** — newer than most LLM training data. Before writing
any Next.js-specific code, read the relevant guide in
`node_modules/next/dist/docs/`. APIs (cookies, params, headers, cache) have
changed significantly.

- `cookies()`, `headers()` are now async — always `await` them.
- Route `params` are now `Promise<{ id: string }>` — always `await params`.
- `revalidateTag` takes `{ expire: 0 }` to bust immediately (not a string TTL).
- Use `"server-only"` import guard on all lib files that touch Supabase.

### Supabase
- **Always use `supabaseAdmin`** (service role) for server-side writes. The anon
  client (`supabase`) is only for Supabase Auth flows (fan-club).
- **Always `.maybeSingle()`** — never `.single()` — on lookups that might return
  nothing. `.single()` throws on empty; `.maybeSingle()` returns `null`.
- Parameterized queries everywhere — Supabase JS client handles this by default.

### Rate Limiting
- Public reads → `checkRateLimit` (fail-open; a Supabase outage won't break reads)
- Public mutations + auth → `checkRateLimitStrict` (fail-closed)
- Admin routes → protected by `requireAdmin()` which already implies session auth;
  add `checkRateLimitStrict` on any admin route that does expensive work.

### Image/Cover Pipeline
Every album, artist, and instrumental cover image **must** go through
`getAlbumCover(src, size)` from `src/lib/albumCover.ts`. Never pass a raw
Cloudinary URL or bare publicId directly to `<img src>`.

### Font Stack
- **Body / UI**: Geist Sans (`--font-geist-sans`) — Tailwind's `font-sans`
- **Monospace**: Geist Mono (`--font-geist-mono`) — Tailwind's `font-mono`
- **All headings h1–h6**: Bungee (`--font-bungee`, CSS `--font-display`)
- All three are loaded via `next/font/google` in `src/app/layout.tsx` and
  exposed as CSS variables on `<html>`.

### Player Queue & Autoplay

- **Queue seeding**: `PlayerContext` fetches `/api/playlist` on mount (when queue is empty), shuffles, and picks the first track that has `albumId && albumCoverImage` as `currentTrack`. It is moved to position 0 in the queue. `audio.src` is set synchronously in the same async block — do not rely on the `[currentTrack]` effect for the first src assignment.
- **Persistence**: Only `volume` and `shuffle` survive page refreshes. `queue`, `currentTrack`, `currentAlbum` reset every load.
- **Autoplay**: Browsers block unprompted `audio.play()`. `TapToStartBanner` listens for the first `pointerdown`/`keydown` anywhere on the page, calls `audio.play()`, and on success calls `store.setPlaying(true)` so the PlayerBar shows the pause icon. Sets `ntv_audio_unlocked` in localStorage so it never reappears.
- **Vault tracks**: Tracks with no `audioUrl` (vault-only WAV) are excluded from the public playlist queue. `playTrack` and `nextTrack` in the store guard against them too.
- **User-gesture chain**: All play-initiating helpers (`togglePlayPause`, `playFromTrack`, `playFromAlbum`, `nextAndPlay`, `previousAndPlay`) call `audio.play()` synchronously from click handlers. Never call `audio.play()` from a `useEffect` — Chrome will block it.

### Admin Auth Flow
1. `requireAdmin()` in `src/lib/auth.ts` — use at top of every `/api/admin/*` handler
2. Session token: 64-char hex, SHA-256 hashed in DB, HttpOnly/Secure/SameSite=Strict cookie
3. Two auth methods: bcrypt password (`ADMIN_PASSWORD_HASH` env) OR WebAuthn passkey
4. Sessions expire after 8 hours; no sliding window yet (C1/H7 open)

### PayPal Checkout Flow
1. `POST /api/paypal/create-order` — server re-prices cart from DB, creates PayPal order, sets HMAC-signed `ntv-co-nonce` cookie (nonce = order ID + timestamp, signed with `CRON_SECRET`)
2. Client completes PayPal UI, gets PayPal `orderId` back
3. `POST /api/paypal/verify` — validates nonce from cookie, captures payment, re-validates price from DB, clears nonce cookie, mints single-use download tokens
4. `POST /api/paypal/webhook` — reliability net; validates PayPal signature, confirms order status, emits tokens for any missed verify calls

### Download Token Flow
- Tokens are minted only after `capturePayPalOrder` confirms `status === "COMPLETED"`
- Single-use: `is_used` flag set atomically on first access
- Default 2-hour expiry (see M8 in SECURITY.md — consider reducing for WAV vault)
- Rate-limited (5/min, strict) per IP

### Cloudinary
- Public audio: `ntp/audio/public/<slug>/` — MP3 320k transcoded on-demand
- Vault WAV: `ntp/audio/vault/<slug>/` — `type: "authenticated"`, admin-only signed URLs
- Folder validation for signed uploads is in `isAllowedFolder()` in
  `src/app/api/admin/cloudinary-sign/route.ts` — add new folders there if needed
- Never persist transformed URLs to DB — apply transforms at render via `getAlbumCover()`

### Analytics
- PostHog: autocapture, heatmaps, session replay. Provider in `src/providers/AnalyticsProvider.tsx`.
- First-party: `src/app/api/analytics/event/route.ts` (events) and `geo/route.ts` (sessions)
- Play counts: fire-and-forget RPC `increment_play_count` via `POST /api/tracks/played`

---

## Key File Locations (Quick Reference)

| What | Where |
|------|-------|
| All DB queries | `src/lib/queries.ts` |
| Auth (sessions, cookies, requireAdmin) | `src/lib/auth.ts` |
| Supabase clients | `src/lib/supabase.ts` |
| Rate limiter | `src/lib/rateLimit.ts` |
| Audit logging | `src/lib/audit.ts` |
| PayPal client | `src/lib/paypal.ts` |
| Discount logic | `src/lib/discounts.ts` |
| Cloudinary helpers | `src/lib/cloudinary.ts` |
| Image pipeline | `src/lib/albumCover.ts` |
| Email (Resend) | `src/lib/email.tsx` |
| Player state | `src/store/playerStore.ts` |
| Checkout state | `src/store/checkoutStore.ts` |
| Audio context | `src/context/PlayerContext.tsx` |
| Global CSS + theme | `src/styles/globals.css` |
| CSP + security headers | `next.config.ts` |
| DB migrations | `supabase/migrations/` |

---

## Deploy Workflow

```bash
# Standard: push to main triggers Vercel integration auto-deploy
git push origin main

# Explicit production deploy via CLI (requires vercel login)
vercel --prod

# Check deployment status
vercel ls
```

Project: `nano-tech-productions` · Org: `team_t7ttcP5QjZi7ahWS554uonzo`
Live URL: https://www.nanotechvibe.com

---

## Environment Variables Reference

See `CLAUDE.md` for the full list. Critical vars that are often missing locally:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PAYPAL_CLIENT_SECRET
CLOUDINARY_API_SECRET
ADMIN_PASSWORD_HASH
CRON_SECRET
```

Pull from Vercel: `vercel env pull .env.local`

---

## Testing

```bash
npx jest src/          # unit tests (34 tests across 3 suites) — all pass
npm run lint           # ESLint
npx tsc --noEmit       # TypeScript (nano-marketing-agent-repo excluded in tsconfig)
npm run build          # production build — compile must pass; page-data step fails locally (no env)
```

Note: `nano-marketing-agent-repo/` is an untracked sibling project in the
workspace. Its tests use Vitest, not Jest. Run `npx jest src/` not `npm test`
to avoid picking up its test files.

---

## Fan Club (In Progress)

Supabase auth-based membership. Routes:
- `POST /api/fan-club/login` — stub (coming soon), rate-limited
- `GET /api/fan-club/me` — returns `fan_club_members` row for authenticated user

**Pending (not done):**
- DB migration for `fan_club_members` table not yet applied to production
- Google OAuth not configured in Supabase dashboard
- Printify product integration not started

---

## Update Instructions for Claude

When you complete a significant change, update this file:
1. Add a row to the **Recent Changes** table
2. Move any newly-fixed items out of **Open** and into the fixed list
3. Add any new gotchas to the **Architecture Gotchas** section
4. Update the **Last Commit** line
