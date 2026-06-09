@AGENTS.md

---

## Startup Directive

This file is the complete knowledge base. Do not explore the codebase at session start. Only open a file when a task requires it. Use `grep` for exact symbols rather than browsing directories.

---

# NTV Vault — Application Knowledge Base

**NTV Vault** — Luxury D2C music marketplace. Artists sell tracks/albums directly to listeners.  
**Domain**: https://www.nanotechvibe.com

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, Server Components) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Language | TypeScript 5 |
| State | Zustand |
| Database | Supabase (PostgreSQL + RLS) |
| CDN/Media | Cloudinary (image & audio transcoding) |
| Payments | PayPal (checkout, orders, webhooks) |
| Email | Resend |
| Analytics | PostHog + Vercel Analytics |
| Errors | Sentry |
| Service Worker | Serwist |
| Testing | Jest, Playwright |
| Hosting | Vercel |

---

## Directory Layout

```
src/
  app/
    admin/(protected)/     # Albums, Tracks, Artists, Sounds, Playlist, Discounts, Orders, Vault, Analytics
    admin/login/           # WebAuthn + password auth
    api/
      admin/               # Protected admin APIs (CRUD, vault, Cloudinary, WebAuthn, audit)
      albums/ artists/ instrumentals/ playlist/ search/  # Public reads
      paypal/              # create-order + webhook
      download/            # Token-gated MP3 + instrumental downloads
      discounts/validate/  # Discount code validation
      tracks/played/       # Play count tracking
      analytics/           # event + geo endpoints
      cron/                # security-check, backup
    album/[id]/ artist/[slug]/ artists/ search/ sounds/ library/
    layout.tsx             # Root layout (sidebar + player)
    page.tsx               # Home page
    sw.ts                  # Service worker (Serwist)
  components/
    layout/                # Sidebar, TopBar, PlayerBar, MobileTabBar, FullScreenPlayer, LyricsModal
    music/                 # AlbumCard, AlbumDetail, AlbumHero, TrackRow
    artist/                # ArtistCard, ArtistHero, ArtistDetailClient
    admin/                 # AlbumForm, TrackForm, InstrumentalForm, CloudinaryUploader, DiscountForm, AdminShell
    paypal/                # CheckoutHost, CheckoutModal
    home/ ui/ search/ library/ sounds/
  lib/
    queries.ts             # Supabase DB queries
    supabase.ts            # client + admin instances
    auth.ts                # session/token management
    paypal.ts albumCover.ts cloudinary.ts discounts.ts
    analytics.ts audit.ts rateLimit.ts logger.ts email.tsx
  store/                   # playerStore, checkoutStore, previewStore (Zustand)
  context/PlayerContext.tsx # Audio element ref + player methods
  types/music.ts           # Album, Track, Artist domain types
supabase/migrations/       # 0001_init → 0010_webauthn
```

---

## Database Schema

**albums**: `id, slug, title, description, release_date, cover_image, bg_color, accent_color, streaming_links (JSONB), is_published`

**tracks**: `id, album_id, title, track_number, duration, price, audio_url, public_audio_id, vault_audio_id, features (JSONB), credits (JSONB), lyrics, has_lyrics, play_count, download_count, is_published`

**artists**: `id, slug, name, bio, profile_image, banner_image, role, location, social_links (JSONB), is_featured, is_published`

**artist_albums** / **artist_tracks**: join tables with role attribution

**instrumentals**: `id, title, slug, type (single|album_track), price, cover_image, public_audio_id, preview_audio_id, is_downloadable, play_count, download_count`

**discount_codes**: `code, discount_percent, applies_to (single|album|all), album_id, expires_at, max_uses, current_uses`

**orders**: `paypal_order_id, customer_email, items (JSONB), subtotal, discount_amount, total, discount_code, status`

**playlist**: `track_id, position, is_active`

**download_tokens**: `token, order_id, track_id, format, expires_at, used_at, is_used` — single-use, rate-limited

**admin_sessions**: `token_hash, expires_at, ip_address, is_revoked`

**admin_webauthn_credentials**: `credential_id, public_key, transports, created_at`

**analytics_events**: `session_id, event_type, track_id, metadata, timestamp`

**analytics_geo**: `session_id, anon_id, device_type, timezone, user_agent, country, ip`

**audit_logs**: `event_type, performed_by, ip_address, user_agent, metadata, timestamp` — append-only

RLS: public read on published content; service role has full access.

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
CRUD for albums/tracks/artists/instrumentals/discounts; WAV vault streaming (5min/15min expiry); Cloudinary signed uploads; WebAuthn; audit logs; cron jobs.

---

## Architectural Patterns

1. **Server Components by default** — `"use client"` only at interactivity boundaries
2. **`unstable_cache`** — memoizes Supabase queries; CDN TTLs: albums 5min, search/playlist 1min, admin no-store
3. **Zustand + localStorage** — `playerStore` (track, queue, shuffle, repeat, volume, seek) persists across refreshes
4. **PlayerContext** — audio element ref, play/pause/next/prev/seek, analytics hooks
5. **SW (Serwist)** — navigate+`/api/*` → NetworkOnly; `/_next/static/*` → CacheFirst; Cloudinary images → CacheFirst 20MB; audio → CacheFirst 25MB/entry 50MB bucket; namespaced by `BUILD_ID` for auto-cleanup
6. **Cloudinary pipeline** — MP3 320k on-the-fly transcode for streaming; signed vault URLs for WAV masters
7. **PayPal checkout** — order created server-side (authoritative price), discount applied before order, webhook completes purchase, single-use download tokens issued only after confirmed payment
8. **Discounts** — percentage-based, per-code expiry + max uses, scoped to track/album/all
9. **Admin auth** — bcrypt password OR WebAuthn/passkey (SimpleWebAuthn), 8-hour sessions, IP audit log
10. **Dual analytics** — PostHog (autocapture, heatmaps, replay, custom events) + first-party endpoints; Sentry for errors
11. **Fire-and-forget play counts** — incremented via RPC without blocking UI
12. **FTS** — Supabase full-text search across albums/tracks/artists; revalidates every 60s
13. **Cover image pipeline** — every `<img>` for an album, artist, or instrumental cover MUST use `getAlbumCover(src, size)` from `src/lib/albumCover.ts`. Accepts a full Cloudinary URL, bare publicId, or local `/assets` path; inserts `f_auto,q_auto:good,w_N,h_N,c_fill` after `/image/upload/`. Bypassing it serves full-resolution originals (5–10× bandwidth, breaks LCP, silently fails bare publicIds).

---

## Design System

**Colors**: Primary `#3DD6C8` (teal) · Secondary `#EB41DF` (pink) · BG `#393838` · Surface `#282828` · Text `#FFFFFF` · Muted `#B3B3B3` · Border `rgba(255,255,255,0.08)`

**Typography**: Body Inter 300–700 · Mono Space Mono · Display 48/700 · H1 32/700 · H2 24/600 · Body 16/400

**Sizing**: Album cards 180px(md)/230px(lg), 8px radius, scale-on-hover · Track rows grid `[40px|1fr|60px]` · Buttons 8px radius, teal CTAs · Spacing 4/8/16/24/32/48px

---

## Environment Variables

```
# Public
NEXT_PUBLIC_SITE_URL  NEXT_PUBLIC_SUPABASE_URL  NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_POSTHOG_KEY  NEXT_PUBLIC_POSTHOG_HOST (us.i.posthog.com)
NEXT_PUBLIC_PAYPAL_CLIENT_ID  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_SENTRY_DSN  NEXT_PUBLIC_ALBUMS_PER_PAGE (default 20)

# Private
SUPABASE_SERVICE_ROLE_KEY  ADMIN_PASSWORD_HASH (bcrypt)
PAYPAL_CLIENT_SECRET  PAYPAL_ENV (sandbox|live)
CLOUDINARY_API_KEY  CLOUDINARY_API_SECRET
SENTRY_ORG  SENTRY_PROJECT  SENTRY_AUTH_TOKEN  POSTHOG_PROJECT_URL
```

---

## Cron Jobs (vercel.json)

- `0 9 * * *` → `GET /api/cron/security-check`
- `0 3 * * *` → `GET /api/cron/backup`

---

## Dev Commands

```bash
npm run dev        # port 3000
npm run build      # production build (--webpack)
npm test           # Jest
npm run test:e2e   # Playwright
npm run lint
```

---

## Security

Full audit (C1–C4 Critical, H1–H7 High, M1–M8 Medium) is in **`SECURITY.md`**. Load it when working on API routes, auth, payments, admin, analytics, or CSP.

---

## Agent Security Enforcement Rules

**Non-negotiable for every code change:**

1. **Never `console.log()` env vars**, tokens, or passwords — they appear in Vercel logs and Sentry.
2. **Never return stack traces to HTTP clients** — log server-side, return generic message to client.
3. **Never skip rate limiting** — new public POST/GET must call `checkRateLimit`/`checkRateLimitStrict` first.
4. **Never trust client-supplied prices, IDs, or quantities** — re-fetch from DB before any financial operation.
5. **Never add `dangerouslySetInnerHTML`** without DOMPurify or server-side sanitization.
6. **Never weaken the CSP** — no new `script-src` domains without approval; no `*` wildcards.
7. **Never expose admin routes without `requireAdmin()`** — every `/api/admin/*` handler must call it first.
8. **Never commit secrets** — `.env*` is gitignored; accidentally committed secrets are treated as compromised.
9. **Always add audit logging** to admin operations — `logAudit()` from `src/lib/audit.ts`.
10. **Always validate webhook signatures** before processing payloads.
11. **Always use parameterized queries** — no string interpolation in Supabase calls.
12. **Run `npm audit` before merging** — block on CRITICAL or HIGH findings.
13. **Always render covers through `getAlbumCover()`** — never pass raw `coverImage`/`profileImage` to `<img src>`.

---

## PR Security Checklist

For PRs touching `src/app/api/**`, `src/lib/auth.ts`, `src/store/`, or `next.config.ts`:

- [ ] New API routes call `checkRateLimitStrict()` for mutations, `checkRateLimit()` for reads
- [ ] Admin routes call `requireAdmin()` before any logic
- [ ] No `console.log` with sensitive values
- [ ] No stack traces or internal paths in client error responses
- [ ] DB writes use parameterized values
- [ ] Admin mutations have a `logAudit()` call
- [ ] Third-party fetch responses validated before trusting
- [ ] CSP not weakened (no new `*` wildcards)
- [ ] `npm audit` passes with no HIGH or CRITICAL findings
- [ ] New env vars added to `.env.example`
