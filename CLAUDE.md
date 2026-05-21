@AGENTS.md

# NTV Vault — Full Application Knowledge Base

## Overview

**Name**: Nano Tech Vibe (NTV) Vault  
**Type**: Direct-to-consumer music distribution platform (D2C marketplace)  
**Domain**: https://www.nanotechvibe.com  
**Purpose**: Luxury, curation-focused music marketplace where artists sell tracks and albums directly to listeners while retaining creative control and maximizing revenue. Premium aesthetic emphasizing exclusivity and craft over algorithmic curation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router, Server Components) |
| UI | React 19.2.4, Tailwind CSS 4, Framer Motion 12.38.0 |
| Language | TypeScript 5.x |
| State | Zustand 5.0.13 |
| Icons | Lucide React 1.14.0 |
| Database | Supabase (PostgreSQL + RLS) |
| CDN/Media | Cloudinary (image & audio transcoding) |
| Payments | PayPal (checkout, orders, webhooks) |
| Email | Resend 6.12.3 |
| Analytics | PostHog 1.372.10 + Vercel Analytics |
| Errors | Sentry 10.53.1 |
| Service Worker | Serwist 9.5.11 |
| Testing | Jest 30.4.2, Playwright 1.60.0 |
| Hosting | Vercel |

---

## Directory Structure

```
/workspaces/nano-tech-productions/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── admin/
│   │   │   ├── (protected)/          # Middleware-protected admin routes
│   │   │   │   ├── albums/           # Album CRUD
│   │   │   │   ├── artists/          # Artist CRUD
│   │   │   │   ├── tracks/           # Track CRUD
│   │   │   │   ├── sounds/           # Instrumental management
│   │   │   │   ├── playlist/         # Playlist management
│   │   │   │   ├── discounts/        # Discount code management
│   │   │   │   ├── orders/           # Order history & analytics
│   │   │   │   ├── analytics/        # Dashboard with geolocation heatmap
│   │   │   │   └── vault/            # WAV audio file management
│   │   │   └── login/                # WebAuthn + password auth
│   │   ├── api/
│   │   │   ├── admin/                # Protected admin APIs
│   │   │   ├── albums/               # Public album listing
│   │   │   ├── artists/              # Artist queries
│   │   │   ├── instrumentals/        # Beats catalog
│   │   │   ├── playlist/             # Continuous shuffle queue
│   │   │   ├── search/               # Full-text search
│   │   │   ├── tracks/played/        # Play count tracking
│   │   │   ├── paypal/               # Order creation & webhooks
│   │   │   ├── download/             # Token-gated audio downloads
│   │   │   ├── discounts/validate/   # Discount code validation
│   │   │   ├── analytics/            # Custom analytics endpoints
│   │   │   └── cron/                 # Scheduled jobs
│   │   ├── album/[id]/               # Album detail page
│   │   ├── artist/[slug]/            # Artist profile pages
│   │   ├── artists/                  # Artist directory
│   │   ├── search/                   # Search interface
│   │   ├── sounds/                   # Instrumentals/beats shop
│   │   ├── library/                  # User library (client-side)
│   │   ├── privacy/ & terms/         # Legal pages
│   │   ├── layout.tsx                # Root layout (sidebar + player)
│   │   ├── page.tsx                  # Home page
│   │   ├── sw.ts                     # Service worker (Serwist)
│   │   └── robots.ts, sitemap.ts     # SEO
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           # Desktop navigation sidebar
│   │   │   ├── TopBar.tsx            # Header with breadcrumbs
│   │   │   ├── PlayerBar.tsx         # Fixed player at bottom
│   │   │   ├── MobileTabBar.tsx      # Mobile navigation
│   │   │   ├── FullScreenPlayer.tsx  # Expanded player modal
│   │   │   ├── LyricsModal.tsx       # Lyrics display
│   │   │   ├── TapToStartBanner.tsx  # Mobile autoplay warning
│   │   │   └── PageTransition.tsx    # Route transition animation
│   │   ├── music/
│   │   │   ├── AlbumCard.tsx         # Album grid card
│   │   │   ├── AlbumDetail.tsx       # Album track listing
│   │   │   ├── AlbumHero.tsx         # Large album header
│   │   │   └── TrackRow.tsx          # Clickable track row
│   │   ├── artist/
│   │   │   ├── ArtistCard.tsx
│   │   │   ├── ArtistHero.tsx
│   │   │   └── ArtistDetailClient.tsx
│   │   ├── admin/
│   │   │   ├── AlbumForm.tsx
│   │   │   ├── TrackForm.tsx
│   │   │   ├── InstrumentalForm.tsx
│   │   │   ├── CloudinaryUploader.tsx
│   │   │   ├── RegisterPasskey.tsx
│   │   │   ├── DiscountForm.tsx
│   │   │   └── AdminShell.tsx
│   │   ├── paypal/
│   │   │   ├── CheckoutHost.tsx
│   │   │   └── CheckoutModal.tsx
│   │   ├── home/
│   │   │   └── HomeClient.tsx        # Landing page layout
│   │   ├── ui/
│   │   │   ├── SentryErrorBoundary.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── skeletons/
│   │   └── search/, library/, sounds/
│   ├── lib/
│   │   ├── queries.ts                # Supabase DB queries
│   │   ├── supabase.ts               # Supabase client + admin instances
│   │   ├── auth.ts                   # Session/token management
│   │   ├── paypal.ts                 # PayPal SDK wrapper
│   │   ├── cloudinary.ts             # URL generation & transforms
│   │   ├── analytics.ts              # PostHog + first-party analytics
│   │   ├── discounts.ts              # Discount validation logic
│   │   ├── audit.ts                  # Security/compliance logging
│   │   ├── rateLimit.ts              # Rate limiting via Supabase RPC
│   │   ├── audioCache.ts             # SW audio cache management
│   │   ├── logger.ts                 # Structured logging
│   │   ├── albumCover.ts             # Image URL generation
│   │   ├── email.tsx                 # Email template components
│   │   └── usePageEngagement.ts      # Analytics hook
│   ├── store/
│   │   ├── playerStore.ts            # Audio playback state (Zustand)
│   │   ├── checkoutStore.ts          # Shopping cart (Zustand)
│   │   └── previewStore.ts           # Track preview state (Zustand)
│   ├── context/
│   │   └── PlayerContext.tsx         # Audio element ref + player methods
│   ├── providers/
│   │   └── AnalyticsProvider.tsx     # PostHog init & page tracking
│   ├── types/
│   │   └── music.ts                  # Domain types (Album, Track, Artist)
│   └── styles/
│       └── globals.css               # Tailwind directives + custom theme
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql             # Core tables
│       ├── 0002_indexes_search_playcount.sql
│       ├── 0003_security_vault.sql   # Download tokens, WAV storage
│       ├── 0004_discount_usage.sql
│       ├── 0005_analytics.sql        # Events, geo, play analytics
│       ├── 0006_album_copyright.sql
│       ├── 0007_lyrics_credits.sql
│       ├── 0008_artists.sql
│       ├── 0009_instrumentals.sql
│       └── 0010_webauthn.sql
├── tests/                            # Playwright E2E tests
├── sentry.*.config.ts
├── instrumentation.ts                # OpenTelemetry / Sentry init
├── next.config.ts                    # CSP headers, SW, caching
├── tsconfig.json                     # Path aliases: @/*
├── tailwind.config.*
├── jest.config.ts
├── playwright.config.ts
├── package.json
├── vercel.json                       # Cron job schedule
└── .env.example
```

---

## Database Schema (Supabase/PostgreSQL)

### Core Tables

**albums**: `id, slug, title, description, release_date, cover_image, bg_color, accent_color, streaming_links (JSONB), is_published`

**tracks**: `id, album_id, title, track_number, duration, price, audio_url, public_audio_id, vault_audio_id, features (JSONB), credits (JSONB), lyrics, has_lyrics, play_count, download_count, is_published`

**artists**: `id, slug, name, bio, profile_image, banner_image, role, location, social_links (JSONB), is_featured, is_published`

**artist_albums**: links artists to albums with role attribution

**artist_tracks**: links artists to tracks with role attribution

**instrumentals**: `id, title, slug, type (single|album_track), price, cover_image, public_audio_id, preview_audio_id, is_downloadable, play_count, download_count`

**discount_codes**: `code, discount_percent, applies_to (single|album|all), album_id, expires_at, max_uses, current_uses`

**orders**: `paypal_order_id, customer_email, items (JSONB), subtotal, discount_amount, total, discount_code, status`

**playlist**: `track_id, position, is_active`

**download_tokens**: `token, order_id, track_id, format, expires_at, used_at, is_used` (single-use, rate-limited)

**admin_sessions**: `token_hash, expires_at, ip_address, is_revoked`

**admin_webauthn_credentials**: `credential_id, public_key, transports, created_at`

**analytics_events**: `session_id, event_type, track_id, metadata, timestamp`

**analytics_geo**: `session_id, anon_id, device_type, timezone, user_agent, country, ip`

**audit_logs**: `event_type, performed_by, ip_address, user_agent, metadata, timestamp`

RLS policies: public read on published content, service role has full access.

---

## API Routes

### Public
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/albums` | List published albums (paginated) |
| GET | `/api/playlist` | Continuous shuffle tracks |
| GET | `/api/search?q=` | Full-text search albums/tracks/artists |
| GET | `/api/instrumentals` | List beats/sounds (paginated) |
| POST | `/api/discounts/validate` | Validate discount code |
| POST | `/api/paypal/create-order` | Create PayPal order (server validates price) |
| POST | `/api/paypal/webhook` | PayPal IPN webhook |
| GET | `/api/download/[token]` | Token-gated MP3 320k download |
| GET | `/api/download/instrumental/[token]` | Token-gated instrumental download |
| POST | `/api/tracks/played` | Increment play count (fire-and-forget) |
| POST | `/api/analytics/event` | Custom analytics events |
| POST | `/api/analytics/geo` | Geolocation tracking |

### Admin (`/api/admin/*`, session-protected)
- CRUD for albums, tracks, artists, instrumentals, discounts
- WAV audio streaming & download routes (5min/15min expiry)
- Cloudinary signed upload URLs
- WebAuthn registration/authentication
- Audit log queries
- Cron: security checks, backups

---

## Key Features

### Audio Playback
- **Zustand `playerStore`**: current track, queue, shuffle, repeat, volume, seek position
- **`PlayerContext`**: audio element ref, play/pause/next/prev/seek controls, analytics hooks
- **Streaming**: Cloudinary on-the-fly transcode to MP3 320kbps; WAV masters in authenticated vault
- **Service Worker (Serwist)** caching strategy:
  - `navigate` → NetworkOnly (always fresh HTML)
  - `/api/*` → NetworkOnly
  - `/_next/static/*` → CacheFirst (hashed, immutable)
  - Cloudinary images → CacheFirst (20MB bucket)
  - Cloudinary audio → CacheFirst (25MB/entry, 50MB bucket) with NetworkFirst fallback
  - Cache namespace keyed by `BUILD_ID` → auto-cleanup on deploy

### E-Commerce
- **PayPal**: order created server-side (authoritative price lookup), discount applied before order, webhook for completion, orders persisted to Supabase
- **Discounts**: percentage-based, per-code expiry + max uses, scoped to single track / album / all
- **Download tokens**: single-use, expiring, rate-limited per IP, audit-logged
- **CheckoutModal**: PayPal React SDK in modal; accepts tracks, albums, instrumentals

### Admin Dashboard
- **Auth**: bcrypt password OR WebAuthn/passkey (SimpleWebAuthn), 8-hour sessions, IP audit log
- **Managers**: Albums, Tracks, Artists, Sounds, Playlist, Discounts, Orders, Vault, Analytics
- **Vault**: WAV streaming for admins, signed download link generation
- **Analytics dashboard**: world heatmap (TopoJSON), play counts, skip analytics

### Search & Discovery
- Supabase FTS across albums, tracks, artists (revalidates every 60s)
- Featured albums / featured artists curated by admin
- Artist pages by slug showing all associated work

### Analytics
- **PostHog**: autocapture, heatmaps, session replay, custom events (play, skip, seek, pause)
- **First-party**: `/api/analytics/event` and `/api/analytics/geo`
- **Sentry**: client + server error tracking with replay
- **Vercel Analytics**: web vitals

---

## Environment Variables

### Public (`NEXT_PUBLIC_*`)
```
NEXT_PUBLIC_SITE_URL           # https://www.nanotechvibe.com
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST       # us.i.posthog.com
NEXT_PUBLIC_PAYPAL_CLIENT_ID
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_ALBUMS_PER_PAGE    # default 20
```

### Private (server-only)
```
SUPABASE_SERVICE_ROLE_KEY
ADMIN_PASSWORD_HASH            # bcrypt hash
PAYPAL_CLIENT_SECRET
PAYPAL_ENV                     # "sandbox" | "live"
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
POSTHOG_PROJECT_URL
```

---

## Security

- **CSP**: tightly scoped in `next.config.ts`; allows PayPal iframe/SDK, Cloudinary CDN, PostHog, Sentry, Cloudflare Insights
- **Rate limiting**: Supabase RPC `check_rate_limit`; strict on downloads (5/min per IP), soft on discount validation
- **Headers**: HSTS preload, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restricts camera/mic/geo
- **Audit trail**: all sensitive operations logged (downloads, admin logins, discount usage)

---

## Caching Strategy

- Service Worker: see Audio Playback section
- Next.js: `unstable_cache` for Supabase queries; revalidate tags for on-demand invalidation
- CDN: albums 5min, search 1min, playlist 1min; admin/API routes no-store

---

## Design System

### Colors
```
Primary accent:   #3DD6C8  (teal)
Secondary accent: #EB41DF  (pink)
Background:       #393838  (dark gray)
Surface:          #282828  (darker gray)
Text primary:     #FFFFFF
Text muted:       #B3B3B3
Border:           rgba(255,255,255,0.08)
```

### Typography
- Body: Inter (300–700 weights)
- Monospace: Space Mono (metadata/timestamps)
- Display: 48px/700, H1: 32px/700, H2: 24px/600, Body: 16px/400

### Component Sizing
- Album cards: 180px (md) or 230px (lg), 8px radius, scale on hover
- Track rows: grid `[40px | 1fr | 60px]`, hover background
- Buttons: 8px radius, teal accent on CTAs
- Spacing scale: 4 / 8 / 16 / 24 / 32 / 48px

---

## Architectural Patterns

1. **Server Components by default** — `"use client"` only at interactivity boundaries
2. **`unstable_cache`** — memoizes Supabase queries across requests per build
3. **Zustand + localStorage** — player state survives page refresh
4. **SW cache namespaced by `BUILD_ID`** — stale assets evicted on deploy
5. **Cloudinary transform pipeline** — on-the-fly MP3 transcode, signed vault URLs, image optimization
6. **Dual analytics** — PostHog + first-party endpoints for cross-validation
7. **Fire-and-forget play counts** — incremented via RPC without blocking UI
8. **WebAuthn passkey** — optional passwordless admin auth alongside bcrypt fallback
9. **Token-gated downloads** — single-use tokens issued only after confirmed PayPal payment
10. **Cover image pipeline** — every `<img>` rendering an album, artist, or instrumental cover MUST use `getAlbumCover(src, size)` from `src/lib/albumCover.ts`. The helper accepts a full Cloudinary URL, a bare publicId, or a local `/assets` path, and inserts `f_auto,q_auto:good,w_N,h_N,c_fill` after `/image/upload/`. Bypassing it serves full-resolution originals (5–10× bandwidth, regresses LCP) and silently breaks any row that stores a bare publicId. Transformations are applied at render time, never persisted to the DB.

---

## Cron Jobs (Vercel)

Defined in `vercel.json`:
- `0 9 * * *` → `GET /api/cron/security-check`
- `0 3 * * *` → `GET /api/cron/backup`

---

## Development Commands

```bash
npm run dev        # Next.js dev server (port 3000)
npm run build      # Production build (--webpack flag)
npm run start      # Production server
npm test           # Jest unit tests
npm run test:e2e   # Playwright E2E
npm run lint       # ESLint
```

---

## External Services Summary

| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL DB, RLS, RPC functions |
| Cloudinary | Image/audio CDN, MP3 on-the-fly transcode |
| PayPal | Payment processing, webhooks |
| PostHog | Product analytics, heatmaps, session replay |
| Sentry | Error tracking, replays |
| Resend | Transactional email |
| Vercel | Hosting, edge functions, cron, analytics |

---

## Architect Security Directive — Stored Prompt

> **Original instruction (2026-05-21):**
> "You are a Lead Software Architect... perform an audit of this apps code base then add your opinion to the claude.md file to be executed by agents. Make sure all suggested changes adhere to current malicious github security vulnerabilities and prepare accordingly. Add a detailed report to the Claude.md file to ensure this application is protected from aggressive penetration attempts on the database, domain, and third party connections."

Every agent working on this codebase must read and enforce the security directives in the section below before writing or modifying any API route, authentication flow, payment handler, analytics endpoint, or admin component. Security regressions are treated as blocking bugs.

---

## Lead Architect Security Audit — NTV Vault (2026-05-21)

### Overall Posture

The application has **solid foundational security** — bcrypt password hashing, HMAC-verified PayPal webhooks, server-side price re-validation, HttpOnly/Secure/SameSite=Strict cookies, Cloudinary signed URLs, and Supabase parameterized queries throughout (no raw SQL concatenation found). However, a full penetration-oriented review uncovered **4 critical, 7 high, and 8 medium** issues that must be resolved before this application can be considered hardened for production under aggressive attack conditions.

---

### CRITICAL VULNERABILITIES (Fix Before Next Deploy)

#### C1 — CSRF Not Enforced on Admin State-Changing Routes
**Files:** All `src/app/api/admin/` POST/PATCH/DELETE routes  
**Risk:** A malicious page visited by an authenticated admin can silently create/delete albums, tracks, discounts, or drain vault downloads by issuing cross-origin requests. SameSite=Strict on the session cookie mitigates *modern* browsers but does not protect against same-site subdomain attacks or older clients.  
**Fix:**
```ts
// In src/lib/auth.ts — add CSRF double-submit cookie helper
import { cookies, headers } from 'next/headers';
import { randomBytes } from 'crypto';

export function setCsrfCookie(): string {
  const token = randomBytes(32).toString('hex');
  cookies().set('ntv-csrf', token, { httpOnly: false, secure: true, sameSite: 'strict', path: '/' });
  return token;
}

export function validateCsrf(): boolean {
  const headerToken = headers().get('x-csrf-token');
  const cookieToken = cookies().get('ntv-csrf')?.value;
  if (!headerToken || !cookieToken) return false;
  return timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
}
```
Every admin mutation route must call `validateCsrf()` before processing. The admin frontend must send `x-csrf-token` header on all fetch calls.

#### C2 — CRON_SECRET Comparison Is Timing-Unsafe
**Files:** `src/app/api/cron/backup/route.ts`, `src/app/api/cron/security-check/route.ts`  
**Risk:** String equality (`header === \`Bearer ${secret}\``) leaks comparison time, allowing character-by-character enumeration of the secret under a timing oracle.  
**Fix:**
```ts
import { timingSafeEqual } from 'crypto';

function verifyCronSecret(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```
Replace the existing string comparison in both cron routes.

#### C3 — Cron Endpoints Are Stub-Only (Silent Failure)
**Files:** `src/app/api/cron/backup/route.ts`, `src/app/api/cron/security-check/route.ts`  
**Risk:** Both endpoints contain `// TODO: real backup` and `// TODO: real security audit`. They return 200 on every call, giving false confidence that backups and security checks are running. No backup means zero recovery capability after a database breach or ransomware attack.  
**Fix — Minimum viable backup:**
- POST to Supabase `pg_dump` endpoint or use Supabase's scheduled backups via the dashboard.
- Log execution timestamp, row counts, and any anomalies (new admin sessions, unusual download spikes) to the `audit_logs` table.
- Send a status notification via Resend on each cron run.
- If implementation is not complete, set `crons: []` in `vercel.json` to stop silent false-success.

#### C4 — Admin Password Hash Lives in Environment Variable
**Files:** `src/lib/auth.ts` — reads `process.env.ADMIN_PASSWORD_HASH`  
**Risk:** Environment variables appear in process listings, CI logs, error reports (Sentry breadcrumbs can capture env context), and are visible to anyone with platform access. A leaked `.env` file or Vercel dashboard access immediately yields the admin password hash for offline cracking.  
**Fix:**
- Move the hash to the `admin_sessions` table as a `password_hash` column (already scoped by RLS).
- Alternatively use Vercel's encrypted secrets and never log or expose the key.
- Add `ADMIN_PASSWORD_HASH` to Sentry's `ignoreErrors`/`denyUrls` and explicitly exclude it from any logging middleware.

---

### HIGH SEVERITY (Fix Within Current Sprint)

#### H1 — No Rate Limiting on Discount Validation Endpoint
**File:** `src/app/api/discounts/validate/route.ts`  
**Risk:** An attacker can brute-force all discount codes at thousands of requests per second, enumerating valid codes and their discount percentages. Codes with short or predictable names (e.g. `SUMMER20`) are trivially found.  
**Fix:** Add `checkRateLimitStrict('discount_validate', ip, 10, 1)` — 10 attempts per IP per minute — at the top of the GET handler. Return 429 with `Retry-After` header on limit exceeded.

#### H2 — No Rate Limiting on Analytics Endpoints
**Files:** `src/app/api/analytics/event/route.ts`, `src/app/api/analytics/geo/route.ts`  
**Risk:** An attacker can spam millions of fake play/skip/seek events, poisoning analytics dashboards, exhausting database write capacity, and potentially causing a DoS via connection pool saturation.  
**Fix:** Add `checkRateLimit('analytics_event', ip, 120, 1)` — 120 events per IP per minute (generous for real users, blocks bots). For geo, `checkRateLimit('analytics_geo', ip, 10, 5)`.

#### H3 — No Rate Limiting on WebAuthn Authentication Routes
**Files:** `src/app/api/admin/auth/webauthn/auth-options/route.ts`, `src/app/api/admin/auth/webauthn/auth-verify/route.ts`  
**Risk:** WebAuthn challenge options endpoint reveals the existence of registered credentials. An attacker probing the endpoint repeatedly can determine if credentials exist and attempt replay or cloning attacks.  
**Fix:** Apply `checkRateLimitStrict('webauthn_auth', ip, 5, 15)` matching the password login limits.

#### H4 — Incomplete Admin Audit Trail (No CRUD Logging)
**File:** `src/lib/audit.ts` and all `src/app/api/admin/` routes  
**Risk:** If an admin account is compromised, there is no record of which albums, tracks, discounts, or Cloudinary uploads were created/modified/deleted. Forensic investigation after an incident is impossible.  
**Fix:** Add `logAudit()` calls to every admin route:
```ts
// Pattern for all admin CRUD routes:
await logAudit({
  event_type: 'admin_album_created', // or _updated, _deleted, etc.
  performed_by: 'admin',
  ip_address: clientIp,
  user_agent: req.headers.get('user-agent') ?? '',
  metadata: { albumId: id, title: body.title, changes: diffKeys },
});
```
Required audit events: `admin_album_*`, `admin_track_*`, `admin_artist_*`, `admin_discount_*`, `admin_instrumental_*`, `admin_vault_access`, `webauthn_registered`, `webauthn_deleted`.

#### H5 — PayPal Webhook Has No IP Allowlist
**File:** `src/app/api/paypal/webhook/route.ts`  
**Risk:** Signature verification is the primary defense. If PayPal's signing key is ever rotated without notice, or if the verification API endpoint is temporarily unavailable (causing the verify call to throw), a forged webhook could be accepted. Defense-in-depth requires source IP validation.  
**Fix:** Add IP allowlist check before signature verification:
```ts
const PAYPAL_IPS = [
  '173.0.80.0/20', '64.4.240.0/21', '66.211.168.0/22',
  '91.243.72.0/22', '212.79.100.0/22', // PayPal production ranges
];
// Use a CIDR library or manually check; reject immediately with 403 if not in list.
```
Verify current PayPal IP ranges at: https://developer.paypal.com/api/rest/webhooks/#link-ipaddresswhitelist

#### H6 — PayPal Order ID Accepted Blindly From Client
**File:** `src/app/api/paypal/verify/route.ts` — `body.orderId`  
**Risk:** Any authenticated browser session can submit any PayPal order ID to the verify endpoint. If two users share a checkout session (shared device), or an attacker guesses/intercepts an order ID, they can claim another user's download tokens.  
**Fix:** Store a server-side mapping of `{checkoutNonce → paypalOrderId}` (in a short-lived cookie or Supabase row) when the order is created. The verify endpoint must confirm the nonce matches before processing.

#### H7 — Session Tokens Not Rotated; No IP Binding
**File:** `src/lib/auth.ts`  
**Risk:** A stolen 8-hour session token gives an attacker full admin access for the remainder of the session with no detection. The IP address is recorded at login but never re-validated on subsequent requests.  
**Fix:**
- **Session rotation:** Issue a new token on every admin request (sliding window) or after 30 minutes of activity.
- **IP binding (soft):** Log a warning and require re-authentication if the session IP changes mid-session. Store the initial IP and check it in `isAdmin()`.

---

### MEDIUM SEVERITY (Fix Within Two Sprints)

#### M1 — `unsafe-eval` and `unsafe-inline` in CSP script-src
**File:** `next.config.ts`  
**Risk:** These CSP directives significantly weaken XSS protection. Any injected script executes. `unsafe-eval` is particularly dangerous as it enables `eval()`, `Function()`, and `setTimeout(string)` vectors.  
**Fix:** Replace `unsafe-inline` with per-request nonces using Next.js middleware. `unsafe-eval` may be required by Framer Motion or Next.js internals — audit which dependency requires it and file a bug if it can be removed. Add `require-trusted-types-for 'script'` once nonces are in place.

#### M2 — No Input Type Validation on Admin Discount Endpoints
**File:** `src/app/api/admin/discounts/route.ts`  
**Risk:** `discount_percent` accepts any value — negative discounts, values over 100, or strings are not rejected. A corrupted discount code could result in negative order totals or free downloads.  
**Fix:**
```ts
if (typeof body.discount_percent !== 'number' || body.discount_percent < 0 || body.discount_percent > 100) {
  return NextResponse.json({ error: 'discount_percent must be 0–100' }, { status: 400 });
}
if (body.expires_at && new Date(body.expires_at) <= new Date()) {
  return NextResponse.json({ error: 'expires_at must be in the future' }, { status: 400 });
}
if (body.max_uses !== null && (typeof body.max_uses !== 'number' || body.max_uses < 1)) {
  return NextResponse.json({ error: 'max_uses must be a positive integer' }, { status: 400 });
}
```

#### M3 — Soft Deletes Not Implemented for Admin Destructive Operations
**Files:** `src/app/api/admin/albums/[id]/route.ts`, tracks, artists, etc.  
**Risk:** A compromised or mistaken admin can permanently delete the entire catalog with no recovery path.  
**Fix:** Add `deleted_at TIMESTAMPTZ` column to `albums`, `tracks`, `artists`, `instrumentals`. Replace `.delete()` with `.update({ deleted_at: new Date().toISOString() })`. Filter `WHERE deleted_at IS NULL` in all public queries. Add a restore endpoint. Log all deletions in `audit_logs`.

#### M4 — Analytics Session ID Not Server-Validated
**File:** `src/app/api/analytics/event/route.ts`  
**Risk:** Clients supply their own `session_id`. Any string is accepted, allowing one client to pollute another client's session data or spoof aggregate metrics.  
**Fix:** Generate `session_id` server-side (tie it to the visit via a short-lived signed cookie) and reject mismatches. At minimum, validate `session_id` is a valid UUID v4.

#### M5 — No Secret Rotation Strategy
**Risk:** `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_SECRET`, `CLOUDINARY_API_SECRET`, `CRON_SECRET`, and `ADMIN_PASSWORD_HASH` have no documented rotation schedule or mechanism. A leaked key has indefinite validity.  
**Fix:**
- Document rotation schedule: 90 days for all secrets.
- Add a cron check that alerts if any secret has not been rotated within the window.
- For Supabase: use Vercel environment variable versioning. For PayPal/Cloudinary: rotate via provider dashboard and update Vercel env.

#### M6 — No Supabase Query Timeouts
**File:** `src/lib/supabase.ts`  
**Risk:** Slow or hung Supabase queries block serverless function instances, causing cascading timeouts, connection pool exhaustion, and potential DoS under moderate traffic spikes.  
**Fix:** Add `statement_timeout` via Supabase client options or RPC timeout parameters. Set 5-second timeout on all queries. Wrap critical paths in `Promise.race()` with a rejection fallback.

#### M7 — Cloudflare IP Forwarding Not Validated
**File:** `src/lib/rateLimit.ts` — `clientIpFromHeaders()`  
**Risk:** The `CF-Connecting-IP` header is only trustworthy if Cloudflare is actually in the request path. In local dev, staging, or if Cloudflare is bypassed (direct IP access), any client can spoof this header and bypass rate limits.  
**Fix:** Verify requests originate from Cloudflare by checking the source IP against Cloudflare's published IP ranges (https://www.cloudflare.com/ips/), or configure Vercel to only accept traffic through Cloudflare.

#### M8 — Download Token Expiry Window Is Long With No Download Count Cap
**File:** `src/app/api/download/[token]/route.ts`  
**Risk:** Download tokens expire after 2 hours. A token intercepted within that window (e.g., via a shared link or clipboard) allows an unlimited number of downloads until the first download marks the token used.  
**Fix:** The current `is_used` flag marks the token as used after the first download — verify this update is atomic and wrapped in a transaction. Consider reducing expiry to 30 minutes for higher-value WAV files in the vault.

---

### GitHub Security Vulnerabilities to Watch (Active as of 2026-05)

Agents must run `npm audit` before committing any dependency changes and resolve all critical and high severity findings. The following dependency categories are active attack vectors in the wild:

| Dependency Category | Current Threat | Action |
|---------------------|---------------|--------|
| `next` < 15.x | Path traversal, SSRF via middleware rewrites (CVE-2025-29927) | Currently on 16.2.6 ✅ |
| `@supabase/supabase-js` | Auth token leakage via postMessage in older versions | Keep ≥ 2.105 ✅ |
| `framer-motion` | Prototype pollution in older `<10.x` | Keep ≥ 12.x ✅ |
| `@simplewebauthn/server` | CBOR parsing DoS in < 9.x | Keep ≥ 13.x ✅ |
| `bcryptjs` | No known critical CVEs in v3.x | ✅ |
| PayPal SDK (`@paypal/react-paypal-js`) | XSS via unsanitized merchant data in older < 8.x | Currently 9.2.0 ✅ |
| `serwist` / Workbox | Cache poisoning if SW scope too broad | Scope is `/` — verify CacheFirst rules exclude `/api/*` ✅ |
| All `@sentry/*` | Info leakage via `sendDefaultPii` if enabled | Verify `sendDefaultPii: false` in sentry configs |

**Supply Chain:** Run `npm audit --audit-level=high` in CI. Any build with unresolved HIGH or CRITICAL advisories must fail the pipeline. Enable GitHub Dependabot alerts and auto-merge for patch-level security updates.

---

### Database Hardening Directives

Agents must not weaken the following database-level controls:

1. **Never use `supabase` (anon key) client for writes** — only `supabaseAdmin` (service role). Reads that don't require auth can use the anon client.
2. **Never disable or bypass RLS policies** on tables that have them (`download_tokens`, `admin_sessions`, `orders`, `audit_logs`).
3. **Never store PII in `metadata` JSONB without a schema** — the `analytics_events.metadata` field must not contain email addresses, full names, or payment data.
4. **Always use `.maybeSingle()` over `.single()`** to avoid throwing on empty results.
5. **Always validate foreign keys in application code** before writing — do not rely on DB constraint errors as flow control (they leak schema information in error messages).
6. **The `audit_logs` table must be append-only** from the application layer — no `UPDATE` or `DELETE` on audit rows via the application service role. Enforce this via a Supabase RLS policy or trigger.
7. **Add a DB-level `statement_timeout = 5000` setting** via Supabase connection pooler config to prevent long-running queries from exhausting connections.

---

### Domain & Infrastructure Hardening Directives

1. **Enforce HTTPS everywhere** — `next.config.ts` already sets HSTS `max-age=63072000` with preload. Submit the domain to the HSTS preload list at https://hstspreload.org if not already done.
2. **DNS CAA records** — Add CAA records to restrict which CAs can issue certificates for the domain. Only Cloudflare and Let's Encrypt should be authorized.
3. **Cloudflare WAF** — Enable Cloudflare's managed rulesets for OWASP top-10. Rate limit at the CDN layer (100 req/min per IP to `/api/*`) as a first line of defense before requests reach Vercel.
4. **Vercel Firewall** — Configure Vercel Firewall custom rules to block known bad-actor ASNs and Tor exit nodes from reaching admin routes (`/admin/*`, `/api/admin/*`).
5. **Subresource Integrity (SRI)** — Any third-party scripts loaded from external CDNs in `next.config.ts` CSP must have integrity hashes. Audit whether PostHog or Cloudflare Insights scripts can be SRI-pinned.
6. **No wildcard CORS** — The `Access-Control-Allow-Origin: *` must never appear. All CORS responses must explicitly name `NEXT_PUBLIC_SITE_URL`. Currently implemented correctly — do not regress.
7. **Robots.txt hardening** — Verify `/robots.txt` disallows `/admin`, `/api`, and `/library` from all crawlers.

---

### Third-Party Connection Hardening

#### PayPal
- Verify webhook endpoint using PayPal's Webhook Simulator before each production deploy.
- Store `PAYPAL_WEBHOOK_ID` alongside the secret — verify it is used in every `verifyWebhookSignature()` call.
- Rotate PayPal client secret every 90 days. Update in Vercel env and redeploy.
- Monitor PayPal developer dashboard for `WEBHOOK_SIGNATURE_FAILURE` events — spikes indicate probe attempts.

#### Supabase
- Enable Supabase "Network Restrictions" to allowlist only Vercel egress IPs.
- Enable Supabase "Leaked password protection" (HaveIBeenPwned integration for auth users).
- Review the `public_instrumentals` view definition — confirm it excludes `vault_audio_id` at the SQL layer.
- Rotate the service role key if ever logged in any error report (Sentry breadcrumbs, Vercel function logs).

#### Cloudinary
- Ensure upload presets used by `CloudinaryUploader.tsx` are **unsigned upload disabled** — only signed uploads via `/api/admin/cloudinary-sign` should be accepted.
- Restrict Cloudinary API key permissions to the minimum: upload and manage in `ntp/` folder only.
- Enable Cloudinary's "Strict transformations" to prevent on-the-fly URL manipulation that bypasses your signed URL requirement.
- The `vault/` folder must use `type: "authenticated"` delivery — verify this in Cloudinary account settings, not just application code.
- The admin uploader stores `secure_url` directly in `cover_image` / `profile_image` columns. Any transformation (resize, format, quality) must be applied at render time via `getAlbumCover`, never persisted to the DB — persisted transforms become unresolvable when target sizes change and double-transform when re-wrapped.

#### PostHog
- Verify `sendDefaultPii: false` is set in `AnalyticsProvider.tsx`.
- Ensure no `$identify()` calls include email addresses unless explicitly consented to by the user.
- Review the PostHog data retention policy — set to 1 year max in PostHog dashboard.

#### Sentry
- Verify `sendDefaultPii: false` in all sentry config files (`sentry.client.config.ts`, `sentry.server.config.ts`).
- Add `ADMIN_PASSWORD_HASH`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_SECRET` to Sentry's `denyUrls` and custom `beforeSend` filter to strip these from any captured event.
- Restrict Sentry project access to engineering team only (not third-party contractors).

---

### Agent Security Enforcement Rules

When any agent modifies code in this repository, the following rules are **non-negotiable**:

1. **Never add `console.log()` calls that print environment variables**, tokens, passwords, or any value derived from `process.env.*` — these appear in Vercel function logs and can be captured by Sentry.
2. **Never return error stack traces or internal error messages to HTTP clients** — log the full error server-side, return a generic message to the client (`{ error: 'An error occurred' }` or appropriate HTTP status).
3. **Never skip rate limiting on new API routes** — every new public POST/GET endpoint must call either `checkRateLimit` or `checkRateLimitStrict` as the first operation after IP extraction.
4. **Never trust client-supplied prices, IDs, or quantities** — always re-fetch from the database and validate server-side before any financial operation.
5. **Never add `dangerouslySetInnerHTML`** without a documented review — the only acceptable use is for sanitized HTML (use DOMPurify or server-side sanitization before rendering).
6. **Never weaken the CSP** — adding new `script-src` domains requires explicit architect approval. Never add `*` wildcards to script-src, connect-src, or img-src.
7. **Never expose admin routes without `requireAdmin()` check** — every file in `src/app/api/admin/*` must import and call `requireAdmin()` at the top of each handler.
8. **Never commit secrets** — `.env*` files are gitignored; if a secret is accidentally committed, treat it as compromised and rotate immediately.
9. **Always add audit logging** to new admin operations — use the existing `logAudit()` helper in `src/lib/audit.ts`.
10. **Always validate webhook signatures** before processing webhook payloads — no exceptions for "testing" or "demo" modes.
11. **Always use parameterized queries** — never use string interpolation inside Supabase `.rpc()`, `.select()`, or `.filter()` calls.
12. **Run `npm audit` before merging** — CI must block merges with CRITICAL or HIGH unresolved advisories.
13. **Always render covers through `getAlbumCover()`** — never pass a raw `coverImage` / `profileImage` value directly to `<img src>`. The helper handles full URLs, bare publicIds, and `/assets` paths, and applies right-sized Cloudinary transforms. Skipping it loads multi-MB originals on every thumbnail.

---

### Quick-Reference Security Checklist (for PR Review)

Before approving any PR touching `src/app/api/**`, `src/lib/auth.ts`, `src/store/`, or `next.config.ts`, verify:

- [ ] New API routes call `checkRateLimitStrict()` for state-changing ops, `checkRateLimit()` for reads
- [ ] Admin routes call `requireAdmin()` before any logic
- [ ] No new `console.log` with sensitive values
- [ ] No client error responses contain stack traces or internal paths
- [ ] New DB writes use parameterized values (no string concat in queries)
- [ ] New admin mutations have corresponding `logAudit()` call
- [ ] New third-party fetch calls validate response status before trusting data
- [ ] CSP in `next.config.ts` not weakened (no new `*` wildcards)
- [ ] `npm audit` passes with no HIGH or CRITICAL findings
- [ ] No new environment variables added without updating `.env.example`
