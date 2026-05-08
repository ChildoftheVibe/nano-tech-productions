/// <reference lib="webworker" />
// Service worker entry. Compiled by @serwist/next at build time and emitted
// to /sw.js. Runtime caching strategies are tuned to NTP's traffic shape:
//
//   • static assets (Next chunks, fonts, images, manifest) → CacheFirst
//   • API routes (/api/...)                                 → NetworkFirst
//   • Cloudinary audio (mp3 streams)                        → CacheFirst, 50 MB cap
//
// Anything not matched falls through to Serwist's defaultCache list, which
// covers Google Fonts, Next data, and the page navigation cache.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const FIFTY_MB = 50 * 1024 * 1024;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Cloudinary audio (video resource type covers mp3/wav transcodes).
      matcher: ({ url }) =>
        url.hostname === "res.cloudinary.com" &&
        url.pathname.includes("/video/upload/"),
      handler: new CacheFirst({
        cacheName: "ntp-audio",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            maxAgeFrom: "last-fetched",
            // ~50 MB cap (workbox/serwist evicts oldest when exceeded).
            purgeOnQuotaError: true,
          }),
          {
            // Skip caching of any single response > 25 MB to keep the bucket
            // useful for many tracks rather than a few oversize ones.
            cacheWillUpdate: async ({ response }) => {
              const len = response.headers.get("content-length");
              if (len && Number(len) > FIFTY_MB / 2) return null;
              return response.status === 200 ? response : null;
            },
          },
        ],
      }),
    },
    {
      // Cloudinary images (album covers).
      matcher: ({ url }) =>
        url.hostname === "res.cloudinary.com" &&
        url.pathname.includes("/image/upload/"),
      handler: new CacheFirst({
        cacheName: "ntp-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            maxAgeFrom: "last-fetched",
          }),
        ],
      }),
    },
    {
      // First-party API routes — fresh-first, fall back to cache offline.
      // Auth + admin routes are explicitly excluded.
      matcher: ({ url, sameOrigin }) =>
        sameOrigin &&
        url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/api/admin/") &&
        !url.pathname.startsWith("/api/paypal/") &&
        !url.pathname.startsWith("/api/download/") &&
        !url.pathname.startsWith("/api/analytics/"),
      handler: new NetworkFirst({
        cacheName: "ntp-api",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
