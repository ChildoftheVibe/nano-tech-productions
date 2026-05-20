import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

// Stable per-deploy identifier. On Vercel this comes straight from the
// commit SHA; locally and in CI it falls back to a timestamp so successive
// `next dev` / `next build` runs each get their own cache namespace.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.GITHUB_SHA?.slice(0, 12) ??
  `build-${Date.now()}`;

// Content-Security-Policy. Tight by default; loosened only where vendors require it.
//
//  - PostHog:     us.i.posthog.com (events) + us-assets.i.posthog.com (recorder/static)
//  - PayPal:      *.paypal.com (SDK + iframe checkout)
//  - Cloudinary:  res.cloudinary.com (images + audio CDN)
//  - Vercel:      vitals.vercel-insights.com + va.vercel-scripts.com
//  - World map:   cdn.jsdelivr.net (TopoJSON for the admin analytics map)
//
// 'unsafe-inline' on script-src is required by the Next.js inline runtime that
// hydrates RSC boundaries; nonces would be cleaner but require per-request work.
//  - Sentry:      *.sentry.io (error ingest) + *.ingest.sentry.io
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.paypal.com https://us-assets.i.posthog.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com https://us-assets.i.posthog.com https://va.vercel-scripts.com",
  "connect-src 'self' https://*.paypal.com https://us.i.posthog.com https://us-assets.i.posthog.com https://vitals.vercel-insights.com https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://cdn.jsdelivr.net https://*.sentry.io https://*.ingest.sentry.io",
  "frame-src https://*.paypal.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const baseSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Expect-CT was deprecated in mid-2023 and is ignored by current browsers
  // since CT enforcement moved into the platform. It's set here only because
  // some scanners/checklists still grade for its presence.
  { key: "Expect-CT", value: "max-age=86400, enforce" },
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      'camera=(), microphone=(), geolocation=(), payment=(self "https://www.paypal.com")',
  },
  // Note: COEP/COOP relaxed from `require-corp`/`same-origin` to allow PayPal &
  // PostHog cross-origin embeds. Tighten again if those go away.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
];

const apiNoStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
  { key: "Pragma", value: "no-cache" },
];

const adminNoIndexHeaders = [
  { key: "Cache-Control", value: "no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable in dev — service workers + Next dev hot-reload play poorly.
  disable: process.env.NODE_ENV === "development",
  // Navigations are NetworkOnly inside sw.ts; caching them here would
  // re-introduce the stale-HTML-after-deploy bug.
  cacheOnNavigation: false,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // Empty turbopack config silences Next 16's "Turbopack with webpack config"
  // notice that fires because @serwist/next contributes a webpack config even
  // when its plugin is disabled in dev.
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  generateBuildId: async () => BUILD_ID,
  webpack(config, { webpack }) {
    config.plugins ??= [];
    // The service worker (compiled as a webpack entry by @serwist/next)
    // reads __NTV_BUILD_ID__ to namespace its caches per-deploy.
    config.plugins.push(
      new webpack.DefinePlugin({
        __NTV_BUILD_ID__: JSON.stringify(BUILD_ID),
      }),
    );
    return config;
  },
  async headers() {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const corsHeaders = siteUrl
      ? [
          { key: "Access-Control-Allow-Origin", value: siteUrl },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Vary", value: "Origin" },
        ]
      : [];

    return [
      { source: "/:path*", headers: baseSecurityHeaders },
      // Apply no-store + CORS to all API routes; specific overrides follow below.
      { source: "/api/:path*", headers: [...apiNoStoreHeaders, ...corsHeaders] },
      // Public read-only APIs that benefit from CDN caching (must come AFTER the
      // catch-all above so their Cache-Control overrides the no-store default).
      {
        source: "/api/albums",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/api/playlist",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=30" },
        ],
      },
      {
        source: "/api/search",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/api/instrumentals",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=60" },
        ],
      },
      { source: "/admin/:path*", headers: adminNoIndexHeaders },
    ];
  },
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? "ntv-vault",
  // Only upload source maps when an auth token is present (CI/Vercel).
  // Silent locally to avoid noisy build output when no credentials are set.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  // Treeshake Sentry SDK logger statements in production.
  reactComponentAnnotation: { enabled: true },
  // Disable automatic instrumentation of server actions (we handle it manually).
  autoInstrumentServerFunctions: false,
});
