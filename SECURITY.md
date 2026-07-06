# NTV Vault — Lead Architect Security Audit (2026-05-21)

> Loaded by agents only when working on security-sensitive code: API routes, auth, payments, admin, analytics, or CSP. For day-to-day development rules see the **Agent Security Enforcement Rules** section in `CLAUDE.md`.

## Overall Posture

Solid foundational security — bcrypt password hashing, HMAC-verified PayPal webhooks, server-side price re-validation, HttpOnly/Secure/SameSite=Strict cookies, Cloudinary signed URLs, Supabase parameterized queries throughout. However a penetration-oriented review uncovered **4 critical, 7 high, and 8 medium** issues to resolve.

---

## CRITICAL — Fix Before Next Deploy

### C1 — CSRF Not Enforced on Admin State-Changing Routes
**Files:** All `src/app/api/admin/` POST/PATCH/DELETE routes  
**Risk:** Malicious page visited by an authenticated admin can silently create/delete albums, tracks, discounts, or drain vault downloads via cross-origin requests. SameSite=Strict mitigates modern browsers but not same-site subdomain attacks or older clients.

```ts
// src/lib/auth.ts — add CSRF double-submit cookie helper
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

Every admin mutation route must call `validateCsrf()` before processing. Admin frontend must send `x-csrf-token` header on all fetch calls.

### C2 — CRON_SECRET Comparison Is Timing-Unsafe
**Files:** `src/app/api/cron/backup/route.ts`, `src/app/api/cron/security-check/route.ts`  
**Risk:** String equality leaks comparison time — character-by-character enumeration under a timing oracle.

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

### C3 — Cron Endpoints Are Stub-Only (Silent Failure)
**Files:** `src/app/api/cron/backup/route.ts`, `src/app/api/cron/security-check/route.ts`  
**Risk:** Both contain `// TODO` stubs and return 200 on every call — no actual backup or security check runs. No backup = zero recovery after a breach.

**Minimum viable fix:**
- POST to Supabase `pg_dump` or use Supabase's scheduled backups dashboard.
- Log execution timestamp, row counts, and anomalies (new admin sessions, unusual download spikes) to `audit_logs`.
- Send status notification via Resend on each cron run.
- Until fully implemented, set `crons: []` in `vercel.json` to stop false-success signals.

### C4 — Admin Password Hash Lives in Environment Variable
**File:** `src/lib/auth.ts` — reads `process.env.ADMIN_PASSWORD_HASH`  
**Risk:** Env vars appear in process listings, CI logs, Sentry breadcrumbs, and are visible to anyone with platform access.

**Fix:**
- Move hash to the `admin_sessions` table as a `password_hash` column (already scoped by RLS).
- Add `ADMIN_PASSWORD_HASH` to Sentry `denyUrls` and exclude from logging middleware.

---

## HIGH SEVERITY — Fix Within Current Sprint

### H1 — No Rate Limiting on Discount Validation Endpoint
**File:** `src/app/api/discounts/validate/route.ts`  
**Fix:** Add `checkRateLimitStrict('discount_validate', ip, 10, 1)` at top of handler. Return 429 with `Retry-After` on limit exceeded.

### H2 — No Rate Limiting on Analytics Endpoints
**Files:** `src/app/api/analytics/event/route.ts`, `src/app/api/analytics/geo/route.ts`  
**Fix:** `checkRateLimit('analytics_event', ip, 120, 1)` and `checkRateLimit('analytics_geo', ip, 10, 5)`.

### H3 — No Rate Limiting on WebAuthn Authentication Routes
**Files:** `src/app/api/admin/auth/webauthn/auth-options/route.ts`, `src/app/api/admin/auth/webauthn/auth-verify/route.ts`  
**Fix:** `checkRateLimitStrict('webauthn_auth', ip, 5, 15)` matching password login limits.

### H4 — Incomplete Admin Audit Trail (No CRUD Logging)
**File:** `src/lib/audit.ts` and all `src/app/api/admin/` routes

```ts
await logAudit({
  event_type: 'admin_album_created', // or _updated, _deleted, etc.
  performed_by: 'admin',
  ip_address: clientIp,
  user_agent: req.headers.get('user-agent') ?? '',
  metadata: { albumId: id, title: body.title, changes: diffKeys },
});
```

Required events: `admin_album_*`, `admin_track_*`, `admin_artist_*`, `admin_discount_*`, `admin_instrumental_*`, `admin_vault_access`, `webauthn_registered`, `webauthn_deleted`.

### H5 — PayPal Webhook Has No IP Allowlist
**File:** `src/app/api/paypal/webhook/route.ts`

```ts
const PAYPAL_IPS = [
  '173.0.80.0/20', '64.4.240.0/21', '66.211.168.0/22',
  '91.243.72.0/22', '212.79.100.0/22',
];
// Reject with 403 if source IP not in list — check before signature verification.
```

Verify current ranges at: https://developer.paypal.com/api/rest/webhooks/#link-ipaddresswhitelist

### H6 — PayPal Order ID Accepted Blindly From Client
**File:** `src/app/api/paypal/verify/route.ts` — `body.orderId`  
**Fix:** Store a server-side `{checkoutNonce → paypalOrderId}` mapping (short-lived cookie or Supabase row) when the order is created. Verify endpoint must confirm the nonce matches before issuing download tokens.

### H7 — Session Tokens Not Rotated; No IP Binding
**File:** `src/lib/auth.ts`  
**Fix:**
- Issue a new token on every admin request (sliding window) or after 30 minutes of activity.
- Log a warning and require re-auth if the session IP changes mid-session.

---

## MEDIUM SEVERITY — Fix Within Two Sprints

### M1 — `unsafe-eval` and `unsafe-inline` in CSP script-src
**File:** `next.config.ts`  
**Fix:** Replace `unsafe-inline` with per-request nonces via Next.js middleware. Audit which dependency requires `unsafe-eval`; add `require-trusted-types-for 'script'` once nonces are in place.

### M2 — No Input Validation on Admin Discount Endpoint
**File:** `src/app/api/admin/discounts/route.ts`

```ts
if (typeof body.discount_percent !== 'number' || body.discount_percent < 0 || body.discount_percent > 100)
  return NextResponse.json({ error: 'discount_percent must be 0–100' }, { status: 400 });
if (body.expires_at && new Date(body.expires_at) <= new Date())
  return NextResponse.json({ error: 'expires_at must be in the future' }, { status: 400 });
if (body.max_uses !== null && (typeof body.max_uses !== 'number' || body.max_uses < 1))
  return NextResponse.json({ error: 'max_uses must be a positive integer' }, { status: 400 });
```

### M3 — Soft Deletes Not Implemented
**Files:** `src/app/api/admin/albums/[id]/route.ts`, tracks, artists, etc.  
**Fix:** Add `deleted_at TIMESTAMPTZ` to `albums`, `tracks`, `artists`, `instrumentals`. Replace `.delete()` with `.update({ deleted_at: new Date().toISOString() })`. Filter `WHERE deleted_at IS NULL` in all public queries. Log all deletions in `audit_logs`.

### M4 — Analytics Session ID Not Server-Validated
**File:** `src/app/api/analytics/event/route.ts`  
**Fix:** Generate `session_id` server-side via a short-lived signed cookie. At minimum, validate that client-supplied `session_id` is a valid UUID v4.

### M5 — No Secret Rotation Strategy
**Fix:** 90-day rotation schedule for `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_SECRET`, `CLOUDINARY_API_SECRET`, `CRON_SECRET`, `ADMIN_PASSWORD_HASH`. Add cron alert if any secret exceeds the rotation window.

### M6 — No Supabase Query Timeouts
**File:** `src/lib/supabase.ts`  
**Fix:** Add `statement_timeout` via Supabase client options. Set 5-second timeout on all queries. Wrap critical paths in `Promise.race()` with a rejection fallback.

### M7 — Cloudflare IP Forwarding Not Validated
**File:** `src/lib/rateLimit.ts` — `clientIpFromHeaders()`  
**Fix:** Verify requests originate from Cloudflare by checking source IP against Cloudflare's published ranges (https://www.cloudflare.com/ips/), or configure Vercel to only accept traffic through Cloudflare.

### M8 — Download Token Expiry Window Is Long
**File:** `src/app/api/download/[token]/route.ts`  
**Fix:** Confirm `is_used` flag update is atomic (wrapped in a transaction). Consider reducing expiry to 30 minutes for WAV vault files.

---

## GitHub Dependency Threats (Active 2026-05)

Run `npm audit --audit-level=high` before every dependency change. Any CI build with unresolved HIGH or CRITICAL advisories must fail.

| Dependency | Threat | Required Version |
|------------|--------|-----------------|
| `next` | Path traversal/SSRF (CVE-2025-29927) | ≥ 15.x — currently 16.2.6 ✅ |
| `@supabase/supabase-js` | Auth token leakage via postMessage | ≥ 2.105 ✅ |
| `framer-motion` | Prototype pollution | ≥ 12.x ✅ |
| `@simplewebauthn/server` | CBOR parsing DoS | ≥ 13.x ✅ |
| `@paypal/react-paypal-js` | XSS via unsanitized merchant data | ≥ 8.x — currently 9.2.0 ✅ |
| `serwist` / Workbox | Cache poisoning if scope too broad | Verify CacheFirst excludes `/api/*` ✅ |
| All `@sentry/*` | Info leakage via `sendDefaultPii` | Verify `sendDefaultPii: false` |

Enable GitHub Dependabot alerts and auto-merge for patch-level security updates.

---

## Database Hardening Directives

1. **Never use `supabase` (anon key) for writes** — only `supabaseAdmin` (service role).
2. **Never disable or bypass RLS** on `download_tokens`, `admin_sessions`, `orders`, `audit_logs`.
3. **Never store PII in `metadata` JSONB** — `analytics_events.metadata` must not contain email, names, or payment data.
4. **Always use `.maybeSingle()` over `.single()`** — avoids throwing on empty results.
5. **Always validate foreign keys in application code** before writing — do not rely on DB constraint errors as flow control.
6. **`audit_logs` is append-only** — no `UPDATE` or `DELETE` from the application layer. Enforce via RLS policy or trigger.
7. **Add `statement_timeout = 5000`** via Supabase connection pooler config.

---

## Domain & Infrastructure Hardening

1. HSTS preload already set (`max-age=63072000`). Submit to https://hstspreload.org if not done.
2. Add DNS CAA records — authorize only Cloudflare and Let's Encrypt.
3. Enable Cloudflare WAF managed rulesets (OWASP top-10). Rate limit at CDN: 100 req/min per IP to `/api/*`.
4. Configure Vercel Firewall to block bad-actor ASNs and Tor exit nodes from `/admin/*` and `/api/admin/*`.
5. SRI-pin any third-party scripts loaded from external CDNs. Audit PostHog and Cloudflare Insights scripts.
6. No wildcard CORS — all `Access-Control-Allow-Origin` must name `NEXT_PUBLIC_SITE_URL` explicitly.
7. Verify `/robots.txt` disallows `/admin`, `/api`, and `/library` from all crawlers.

---

## Third-Party Connection Hardening

### PayPal
- Verify webhook endpoint via PayPal's Webhook Simulator before each production deploy.
- Confirm `PAYPAL_WEBHOOK_ID` is used in every `verifyWebhookSignature()` call.
- Rotate client secret every 90 days. Monitor dashboard for `WEBHOOK_SIGNATURE_FAILURE` spikes.

### Supabase
- Enable "Network Restrictions" — allowlist only Vercel egress IPs.
- Enable "Leaked password protection" (HaveIBeenPwned integration).
- Confirm `public_instrumentals` view excludes `vault_audio_id` at the SQL layer.
- Rotate service role key if ever captured in any error report or log.

### Cloudinary
- `CloudinaryUploader.tsx` presets must have unsigned upload **disabled** — only signed uploads via `/api/admin/cloudinary-sign`.
- Restrict API key to upload/manage in `ntp/` folder only.
- Enable "Strict transformations" in Cloudinary dashboard.
- `vault/` folder must use `type: "authenticated"` delivery.
- Never persist transformed URLs to the DB — apply transforms at render time via `getAlbumCover()`.

### PostHog
- `sendDefaultPii: false` in `AnalyticsProvider.tsx`.
- No `$identify()` calls with email addresses without explicit user consent.
- Data retention: 1 year max in PostHog dashboard.

### Sentry
- `sendDefaultPii: false` in all sentry config files.
- Add `ADMIN_PASSWORD_HASH`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_SECRET` to `beforeSend` filter.
- Restrict project access to engineering team only.
