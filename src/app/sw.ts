/// <reference lib="webworker" />
// Service worker entry. Compiled by @serwist/next at build time and emitted
// to /sw.js. Strategy table:
//
//   destination "navigate" (HTML)   → NetworkOnly        (always fresh)
//   /api/*                          → NetworkOnly        (no caching, ever)
//   /_next/static/*                 → CacheFirst         (immutable, hashed)
//   res.cloudinary.com /video/upload→ CacheFirst, 25MB/entry, 50MB bucket
//   res.cloudinary.com /image/upload→ CacheFirst, 20MB bucket
//   everything else                 → NetworkFirst, 3s timeout → cache
//
// All caches are namespaced with the build ID injected via webpack's
// DefinePlugin (__NTV_BUILD_ID__). On each deploy the prefix changes; the
// activate handler below deletes every cache that doesn't carry the
// current prefix, so stale assets from previous builds never linger.
//
// `skipWaiting: true` — new SW activates immediately; `clientsClaim` takes
// control of all open tabs, which then reload via the controllerchange event.
// Cloudinary handlers return silent fallbacks on network failure so Cloudflare
// blocks (ERR_FAILED) don't surface as loud console errors.
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// Injected by webpack.DefinePlugin in next.config.ts.
declare const __NTV_BUILD_ID__: string;

declare const self: ServiceWorkerGlobalScope;

const SW_MANUAL_VERSION = '3';
const BUILD_ID =
  typeof __NTV_BUILD_ID__ !== "undefined" ? __NTV_BUILD_ID__ : "dev";
const CACHE_PREFIX = `ntv-v${SW_MANUAL_VERSION}-${BUILD_ID}`;

const TWENTY_FIVE_MB = 25 * 1024 * 1024;

// Minimal 1×1 transparent PNG returned when a Cloudinary image is unreachable.
// Using atob keeps the SW bundle small without a separate asset import.
function transparentPngResponse(): Response {
  const bytes = Uint8Array.from(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII='),
    (c) => c.charCodeAt(0),
  );
  return new Response(bytes, { status: 200, headers: { 'Content-Type': 'image/png' } });
}

function silentAudioResponse(): Response {
  return new Response(null, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
}

function isCloudinary(url: URL): boolean {
  return url.hostname === 'res.cloudinary.com' || url.hostname === 'cloudinary.com';
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  cacheId: CACHE_PREFIX,
  runtimeCaching: [
    {
      // HTML navigations: never cache. Stale HTML after a deploy is the
      // single largest source of "users see old code" reports.
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
    {
      // First-party API. Never cache. Includes /api/admin/*, /api/paypal/*,
      // /api/download/*, /api/analytics/*, /api/playlist*, /api/search,
      // /api/albums, and everything else under /api/.
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      // Next.js static chunks are content-hashed in their filename — safe
      // to cache forever.
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "static",
      }),
    },
    {
      // Cloudinary audio (video resource type covers mp3/wav transcodes).
      matcher: ({ url }) =>
        isCloudinary(url) && url.pathname.includes("/video/upload/"),
      handler: new CacheFirst({
        cacheName: "audio",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            maxAgeFrom: "last-fetched",
            purgeOnQuotaError: true,
          }),
          {
            // Reject any single entry > 25 MB so a few huge files can't
            // monopolize the ~50 MB bucket budget.
            cacheWillUpdate: async ({ response }) => {
              const len = response.headers.get("content-length");
              if (len && Number(len) > TWENTY_FIVE_MB) return null;
              return response.status === 200 ? response : null;
            },
          },
          {
            // Network error (e.g. Cloudflare block) with no cached copy —
            // return an empty 200 so the audio element fails silently.
            handlerDidError: async () => silentAudioResponse(),
          },
        ],
      }),
    },
    {
      // Cloudinary images (album covers, etc.).
      matcher: ({ url }) =>
        isCloudinary(url) && url.pathname.includes("/image/upload/"),
      handler: new CacheFirst({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            maxAgeFrom: "last-fetched",
            purgeOnQuotaError: true,
          }),
          {
            // Network error with no cached copy — return a 1×1 transparent
            // PNG so broken-image icons don't appear in the UI.
            handlerDidError: async () => transparentPngResponse(),
          },
        ],
      }),
    },
    {
      // Everything else (fonts, third-party scripts, etc.) — fresh first
      // with a tight 3s timeout so offline still has something to fall
      // back to.
      matcher: () => true,
      handler: new NetworkFirst({
        cacheName: "default",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

// On activate: delete every cache that doesn't carry the current build's
// prefix. This is what prevents stale-asset bleed-through across deploys.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !name.startsWith(CACHE_PREFIX))
          .map((name) => {
            console.log('[SW] Deleted old cache:', name);
            return caches.delete(name);
          }),
      );
      await self.clients.claim();
    })(),
  );
});

