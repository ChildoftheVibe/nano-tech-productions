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
      paypal/              # create-order + verify + webhook
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
    music/                 # AlbumCard, AlbumDetail, AlbumHero, TrackRow, AlbumMediaGallery
    artist/                # ArtistCard, ArtistHero, ArtistDetailClient
    admin/                 # AlbumForm, TrackForm, InstrumentalForm, CloudinaryUploader, DiscountForm, AdminShell
    paypal/                # CheckoutHost, CheckoutModal
    home/ ui/ search/ library/ sounds/
  lib/
    queries.ts             # Supabase DB queries
    supabase.ts            # client + admin instances
    auth.ts                # session/token management
    paypal.ts albumCover.ts cloudinary.ts discounts.ts
    analytics.ts audit.ts rateLimit.ts logger.ts email.tsx playlistSeed.ts
  store/                   # playerStore, checkoutStore, previewStore (Zustand)
  context/PlayerContext.tsx # Audio element ref + player methods
  components/layout/PlayerSeeder.tsx # Server-side queue seed (client component, rendered in layout)
  types/music.ts           # Album, Track, Artist domain types
supabase/migrations/       # 0001_init → 0010_webauthn
```

---

## Database Schema

**albums**: `id, slug, title, description, release_date, cover_image, bg_color, accent_color, streaming_links (JSONB), light_mode, is_published`

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

**album_media**: `id, album_id (→ albums), url, public_id, media_type (image|video), position, caption, created_at` — gallery images/videos per album; public read via RLS

RLS: public read on published content; service role has full access.

---

## API Routes

### Public
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/albums` | List published albums (paginated) |
| GET | `/api/playlist` | Admin-curated queue (ordered) or shuffle fallback; returns `{ tracks, isAdminCurated }` |
| GET | `/api/search?q=` | Full-text search albums/tracks/artists |
| GET | `/api/instrumentals` | List beats/sounds (paginated) |
| POST | `/api/discounts/validate` | Validate discount code |
| POST | `/api/paypal/create-order` | Create PayPal order (server validates price), set nonce cookie |
| POST | `/api/paypal/verify` | Capture payment, validate nonce, mint download tokens |
| POST | `/api/paypal/webhook` | PayPal IPN webhook (reliability net) |
| GET | `/api/download/[token]` | Token-gated MP3 320k download |
| GET | `/api/download/instrumental/[token]` | Token-gated instrumental download |
| POST | `/api/tracks/played` | Increment play count (fire-and-forget) |
| POST | `/api/analytics/event` | Custom analytics events |
| GET | `/api/albums/[slug]/media` | Public gallery media for an album (images + videos) |
| POST | `/api/analytics/event` | Custom analytics events |
| POST | `/api/analytics/geo` | Geolocation tracking |

### Admin (`/api/admin/*`, session-protected)
CRUD for albums/tracks/artists/instrumentals/discounts; WAV vault streaming (5min/15min expiry); Cloudinary signed uploads; WebAuthn; audit logs; cron jobs; album media gallery (`/api/admin/album-media`, `/api/admin/album-media/[id]`).

---

## Architectural Patterns

1. **Server Components by default** — `"use client"` only at interactivity boundaries
2. **`unstable_cache`** — memoizes Supabase queries; CDN TTLs: albums 5min, search/playlist 1min, admin no-store
3. **Zustand + localStorage** — `playerStore` manages all player state; only `volume` and `shuffle` persist to localStorage across refreshes. `queue`, `currentTrack`, and `currentAlbum` reset to empty on every page load and are re-seeded by `PlayerSeeder` on mount.
4. **PlayerSeeder + PlayerContext** — Queue seeding is split into two layers:
   - **`PlayerSeeder`** (`src/components/layout/PlayerSeeder.tsx`) — `"use client"` component rendered inside `PlayerProvider` in `layout.tsx`. Receives up to 500 tracks + `isAdminCurated` flag as **props** pre-fetched server-side by the root layout (`getPlaylistTracks()` in the same `Promise.all` as `getAlbums`). On mount, calls `buildSeed(tracks, { ordered: isAdminCurated })` to build the queue (preserving admin order when curated, shuffling otherwise), promotes the first track with an album cover to position 0, calls `store.setQueue()`, and sets `audio.src` synchronously. If the server prefetch returned no tracks, falls back to `ensureQueueSeeded(false)` — a client-side `/api/playlist` fetch — so the queue is self-healing even if the server render failed.
   - **`PlayerContext`** (`src/context/PlayerContext.tsx`) — audio element ref, play/pause/next/prev/seek, analytics hooks, **ongoing queue extension** (when fewer than 5 tracks remain, fetches `/api/playlist` and appends deduped tracks respecting `isAdminCurated`), and **`ensureQueueSeeded(autoplay?)`** (populates an empty queue on demand; used by `PlayerSeeder` fallback and `FullScreenPlayer` on open).
   - **`playlistSeed.ts`** (`src/lib/playlistSeed.ts`) — shared `buildSeed(tracks, { ordered? })` helper. When `ordered=false` (default): shuffles + promotes first track with cover. When `ordered=true` (admin-curated): preserves position order, still promotes first track with cover to position 0.
   - **Admin-curated queue** — `getPlaylistTracks()` checks the `playlist` table first (tracks the admin added via `/admin/playlist`, ordered by `position`, filtered by `is_active=true`). Returns `{ tracks, isAdminCurated: true }`. Falls back to all published tracks with `isAdminCurated: false` when the playlist table is empty. This result flows through `layout.tsx` → `PlayerSeeder` → `buildSeed` so admin ordering is preserved end-to-end for every visitor.
   - All play-initiating actions call `audio.play()` directly from click handlers to preserve the user-gesture chain required by browser autoplay policy. `TapToStartBanner` (`src/components/layout/TapToStartBanner.tsx`) shows on first visit, calls `audio.play()` on any pointer/key event to unlock the audio element, and syncs `store.setPlaying(true)` on success. Vault-only tracks (no `audioUrl`) are excluded from the public queue.
   - **FullScreenPlayer empty-queue recovery** — if the full-screen player is opened before the queue is seeded, it calls `ensureQueueSeeded(true)` (populate + start playing) instead of auto-closing.
5. **SW (Serwist)** — navigate+`/api/*` → NetworkOnly; `/_next/static/*` → CacheFirst; Cloudinary images → CacheFirst 20MB; audio → CacheFirst 25MB/entry 50MB bucket; namespaced by `BUILD_ID` for auto-cleanup
6. **Cloudinary pipeline** — MP3 320k on-the-fly transcode for streaming; signed vault URLs for WAV masters
7. **PayPal checkout** — order created server-side (authoritative price), nonce cookie set on `create-order` and validated on `verify` (prevents replay), discount applied before order, webhook restricted to PayPal IP allowlist, single-use download tokens issued only after confirmed capture
8. **Discounts** — percentage-based, per-code expiry + max uses, scoped to track/album/all
9. **Admin auth** — bcrypt password OR WebAuthn/passkey (SimpleWebAuthn), 8-hour sessions, IP binding, CSRF double-submit cookie on all mutations
10. **Dual analytics** — PostHog (autocapture, heatmaps, replay, custom events) + first-party endpoints; Sentry for errors
11. **Fire-and-forget play counts** — incremented via RPC without blocking UI
12. **FTS** — Supabase full-text search across albums/tracks/artists; revalidates every 60s
13. **Cover image pipeline** — every `<img>` for an album, artist, or instrumental cover MUST use `getAlbumCover(src, size)` from `src/lib/albumCover.ts`. Accepts a full Cloudinary URL, bare publicId, or local `/assets` path; inserts `f_auto,q_auto:good,w_N,h_N,c_fill` after `/image/upload/`. Bypassing it serves full-resolution originals (5–10× bandwidth, breaks LCP, silently fails bare publicIds).
14. **Audio CORS** — all `<audio>` elements carry `crossOrigin="anonymous"` to prevent `ERR_BLOCKED_BY_RESPONSE` on Cloudinary-served audio.
15. **Cron auth** — `/api/cron/*` routes validate `Authorization: Bearer <CRON_SECRET>` from `vercel.json` cron config; reject requests without it.
16. **Desktop Now Playing screen** — Full-screen overlay toggled by `store.fullScreenOpen`. Opened from the PlayerBar "Now Playing" button (desktop) or the track info area (mobile). Displays album art, accent-themed gradient background, waveform, lyrics toggle, and queue drawer.
17. **Album detail modals** — `AlbumDetail` has two accent-colored modals: (a) **Credits modal** — `BookOpen` button, only rendered when the album has credits; shows all production credits per track. (b) **Media gallery modal** — `Images` button always visible; lazy-fetches `GET /api/albums/[slug]/media` on first open; `AlbumMediaGallery` component supports swipe, keyboard nav, thumbnail strip, and captions. Both modals use the album's `accentColor` for borders, glows, and accent bars.
18. **Album media admin** — `AlbumsManager` has a "Media" button per album row that fetches existing entries from `GET /api/admin/album-media?album_id=` and opens `AlbumMediaManager` inline. Upload via Cloudinary; drag-to-reorder; delete. Media stored in `album_media` table.
19. **Album light mode** — per-album `light_mode` flag (DB column, defaults `false`), toggled from the admin `AlbumForm`. Flows through `mapAlbum` → `Album.lightMode`. `AlbumDetail` + `TrackRow` read shared theme tokens from `getAlbumTheme(light)` (`src/lib/albumTheme.ts`) to swap surfaces/text/borders between dark (default) and light; the album's `accentColor` is unchanged in both. Root exposes `--album-hover` CSS vars for child hover states. Media viewers (`AlbumCoverCarousel`, `AlbumMediaGallery`) stay dark by design.

---

## Design System

Source of truth: `2027DESIGN.md`. All tokens below are live in production.

**Core Colors**

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#62f3e4` | CTAs, active states, teal glows |
| `secondary` | `#ffabef` | Contrast accents, badges |
| `on-primary` | `#003733` | Text on teal buttons (never `text-black`) |
| `surface-container-lowest` | `#090f0e` | Page background |
| `surface-container` | `#1a2120` | Sidebar, elevated panels |
| `surface-container-high` | `#242b2a` | Cards, inputs |
| `surface-container-highest` | `#2f3635` | Progress tracks, scrubbers |
| `on-surface` | `#dde4e2` | Primary text (replaces `#ffffff`) |
| `on-surface-variant` | `#bbcac6` | Secondary text, inactive nav |
| `text-muted` | `#b3b3b3` | Hints, timestamps |
| `border` | `rgba(255,255,255,0.08)` | Dividers |

**Typography**

- **Body**: Geist Sans (Inter-compatible) 300–700
- **Mono**: Geist Mono / Space Mono — timestamps, metadata labels
- **Display/Headings**: Bungee (`var(--font-bungee)`) — used **only** for: brand wordmark, hero titles, section labels (`New Horizons`, `YOUR COLLECTION`), album title on detail/now-playing pages, Sounds/Artists/Library page headings. Never on body text, track titles, nav items, or metadata.
- Class: `font-[family-name:var(--font-bungee)]` with `tracking-tight`

**CSS Utilities** (defined in `src/styles/globals.css`)

- `.glass-panel` — `rgba(26,33,32,0.7)` + `backdrop-filter:blur(12px)` + border
- `.glass-card` — `rgba(255,255,255,0.03)` + blur + hover: translateY(-4px) + teal border
- `.teal-glow` — `box-shadow: 0 0 20px rgba(98,243,228,0.3)`
- `.teal-glow-hover` — teal glow, intensifies to 35px on hover
- `.pink-glow` — `box-shadow: 0 0 20px rgba(255,171,239,0.3)`
- `.bg-gradient-mesh` — radial teal gradient for FullScreenPlayer bg
- `.animate-drift` — 20s slow scale 1→1.05 loop for blurred bg art
- `.no-scrollbar` — hide scrollbar on overflow containers

**Sizing**: Album cards 180px(md)/230px(lg) · Track rows grid `[40px|1fr|60px]` · Sidebar 280px · PlayerBar 56px (mobile) / 80px (desktop) · Spacing xs/sm/md/lg/xl/2xl = 4/8/16/24/32/48px

**AlbumCard play overlay**: Full-card centered teal circle (not bottom-right corner) — dark scrim + teal glow shadow.

**PWA**: Icons at `/public/icons/icon-192.png` and `/public/icons/icon-512.png`. Manifest at `/public/manifest.json`. `InstallPromptBanner` references `/icons/icon-192.png`.

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
