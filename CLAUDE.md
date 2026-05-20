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
