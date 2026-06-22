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

## Current Project State (as of 2026-06-22)

### Recent Changes

| Session | Change |
|---------|--------|
| 2026-06-22 | Font: All `h1–h6` now use **Bungee** (next/font/google, CSS var `--font-bungee`). Set in `src/app/layout.tsx` and `src/styles/globals.css`. |
| 2026-06-22 | Security audit + fixes (see Open Security Issues below) |
| 2026-06-22 | `tsconfig.json` now excludes `nano-marketing-agent-repo/` (untracked sibling project that caused false TS errors) |

### Last Commit
`013c02e` — fix: add crossOrigin=anonymous to audio elements

---

## Security Posture

Full audit document: `SECURITY.md` (untracked, load when working on API/auth/payments).

### Fixed This Session
- **C2** Cron secret comparison is now timing-safe (`crypto.timingSafeEqual`)
- **H1** Discount validation endpoint has rate limiting (10/min, strict)
- **H2** Analytics endpoints have rate limiting (120/min events, 10/5min geo)
- **H3** WebAuthn auth-options + auth-verify have rate limiting (5/15min, strict)
- **H4** Admin CRUD audit logs: albums, tracks, discounts now emit `logAuditEvent` on create/update/delete (artists already had them)
- **M2** Admin discount POST validates `discount_percent` (1–100), `expires_at` (future), `max_uses` (positive int)
- **Bug** Analytics routes returned raw Supabase `error.message` — now `"internal_error"`
- **Bug** WAV stream route logged `trackId` before auth check — moved to after `isAdmin()`

### Still Open (Not Fixed — Requires Planning)
| ID | Issue | Notes |
|----|-------|-------|
| C1 | No CSRF on admin mutation routes | Requires `x-csrf-token` header on every admin fetch + double-submit cookie helper in `src/lib/auth.ts`. Multi-PR scope. |
| C3 | Cron routes are TODO stubs | `/api/cron/security-check` and `/api/cron/backup` return 200 but do nothing real. |
| C4 | `ADMIN_PASSWORD_HASH` in env var | Architectural: move to DB row in `admin_sessions` table. |
| H5 | PayPal webhook has no IP allowlist | Add Cloudflare WAF rule or middleware check against PayPal's published IP ranges. |
| H6 | Client-supplied PayPal `orderId` not nonce-validated | Server should issue a short-lived nonce when order is created and validate it in verify. Requires checkout flow changes. |
| H7 | Admin sessions not rotated; no IP binding | Session sliding-window refresh + IP-change warning. |
| M1 | `unsafe-eval` + `unsafe-inline` in CSP | Requires per-request nonce middleware. PayPal SDK may require `unsafe-eval` — audit first. |

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

### Admin Auth Flow
1. `requireAdmin()` in `src/lib/auth.ts` — use at top of every `/api/admin/*` handler
2. Session token: 64-char hex, SHA-256 hashed in DB, HttpOnly/Secure/SameSite=Strict cookie
3. Two auth methods: bcrypt password (`ADMIN_PASSWORD_HASH` env) OR WebAuthn passkey
4. Sessions expire after 8 hours; no sliding window yet (C1/H7 open)

### PayPal Checkout Flow
1. `POST /api/paypal/create-order` — server re-prices cart from DB, creates PayPal order
2. Client completes PayPal UI
3. `POST /api/paypal/verify` — captures payment, re-validates price, mints download tokens
4. `POST /api/paypal/webhook` — reliability net; signature-verified before processing

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
