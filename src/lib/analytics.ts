"use client";

import posthog, { type PostHog } from "posthog-js";
import type { Album, Track } from "@/types/music";

// ─────────────────────────────────────────────────────────────────────
// Unified analytics. Fires to PostHog (heatmaps, replays, autocapture)
// AND to our first-party /api/analytics/event endpoint so the admin
// dashboard can compute totals, skip points, and trends without hitting
// PostHog's API.
//
// Designed to no-op cleanly when:
//   - rendered on the server (typeof window === "undefined")
//   - NEXT_PUBLIC_POSTHOG_KEY is not set (still posts first-party events)
// ─────────────────────────────────────────────────────────────────────

const SESSION_KEY = "ntv_session_id";
const ANON_ID_KEY = "ntv_anon_id";
const POSTHOG_INITIALIZED = "ntv_posthog_initialized";

const isBrowser = () => typeof window !== "undefined";

function uuid(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeStorageGet(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable or denied, so don't crash.
  }
}

export function getSessionId(): string {
  if (!isBrowser()) return "";
  let id = safeStorageGet(SESSION_KEY);
  if (!id) {
    id = uuid();
    safeStorageSet(SESSION_KEY, id);
  }
  return id;
}

export function getAnonymousId(): string {
  if (!isBrowser()) return "";
  let id = safeStorageGet(ANON_ID_KEY);
  if (!id) {
    id = uuid();
    safeStorageSet(ANON_ID_KEY, id);
  }
  return id;
}

export function deviceType(): "mobile" | "tablet" | "desktop" {
  if (!isBrowser()) return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|tablet|Tablet/.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/.test(ua)) return "mobile";
  return "desktop";
}

export function initPostHog(): PostHog | null {
  if (!isBrowser()) return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  // Idempotent — calling init twice from React StrictMode duplicates events.
  const w = window as unknown as Record<string, unknown>;
  if (w[POSTHOG_INITIALIZED]) return posthog;
  w[POSTHOG_INITIALIZED] = true;

  const defaultHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const flagsHost = process.env.NEXT_PUBLIC_POSTHOG_FLAGS_HOST ?? defaultHost;
  const uiHost = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? defaultHost;

  posthog.init(key, {
    api_host: defaultHost,
    flags_api_host: flagsHost,
    ui_host: uiHost,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage",
    session_recording: { maskAllInputs: true },
    loaded: (ph) => {
      const anon = getAnonymousId();
      if (anon) ph.identify(anon);
    },
  });

  return posthog;
}

export function getPostHog(): PostHog | null {
  if (!isBrowser()) return null;
  const w = window as unknown as Record<string, unknown>;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (!w[POSTHOG_INITIALIZED]) return null;
  return posthog;
}

// ─────────────────────────────────────────────────────────────────────
// First-party event ingestion. Beacon-capable so it survives page unload.
// ─────────────────────────────────────────────────────────────────────

type FirstPartyPayload = {
  event_type: string;
  track_id?: string | null;
  album_id?: string | null;
  position_seconds?: number;
  duration_seconds?: number;
  percent?: number;
  query?: string;
  metadata?: Record<string, unknown>;
};

function postEvent(payload: FirstPartyPayload): void {
  if (!isBrowser()) return;
  const body = JSON.stringify({
    ...payload,
    session_id: getSessionId(),
  });
  try {
    if ("sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/analytics/event", blob);
      if (ok) return;
    }
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // analytics is best-effort
  }
}

// ─────────────────────────────────────────────────────────────────────
// Public tracking API
// ─────────────────────────────────────────────────────────────────────

export function trackPageView(
  path: string,
  properties: Record<string, unknown> = {},
): void {
  const ph = getPostHog();
  if (ph) {
    ph.capture("$pageview", {
      $current_url: isBrowser() ? window.location.href : path,
      path,
      referrer: isBrowser() ? document.referrer : undefined,
      device_type: deviceType(),
      ...properties,
    });
  }
  postEvent({
    event_type: "page_view",
    metadata: { path, ...properties },
  });
}

export function trackAlbumView(album: Pick<Album, "id" | "title" | "releaseDate">): void {
  const releaseYear = album.releaseDate?.slice(0, 4) ?? null;
  getPostHog()?.capture("album_view", {
    album_id: album.id,
    album_title: album.title,
    release_year: releaseYear,
  });
  postEvent({
    event_type: "album_view",
    album_id: album.id,
    metadata: { release_year: releaseYear },
  });
}

export function trackAlbumViewEnd(albumId: string, msSpent: number): void {
  getPostHog()?.capture("album_view_end", {
    album_id: albumId,
    seconds_on_page: Math.round(msSpent / 1000),
  });
  postEvent({
    event_type: "album_view_end",
    album_id: albumId,
    duration_seconds: msSpent / 1000,
  });
}

export function trackPlayStart(
  track: Track,
  album: Album | null | undefined,
  position: number,
): void {
  getPostHog()?.capture("play_start", {
    track_id: track.id,
    track_title: track.title,
    album_id: album?.id ?? track.albumId ?? null,
    album_title: album?.title,
    queue_position: position,
    device_type: deviceType(),
  });
  postEvent({
    event_type: "play_start",
    track_id: track.id,
    album_id: album?.id ?? track.albumId ?? null,
    metadata: { queue_position: position },
  });
}

export function trackPlayProgress(
  track: Track,
  currentTime: number,
  duration: number,
): void {
  const percent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  getPostHog()?.capture("play_progress", {
    track_id: track.id,
    track_title: track.title,
    current_seconds: currentTime,
    duration_seconds: duration,
    percent_complete: percent,
  });
  postEvent({
    event_type: "play_progress",
    track_id: track.id,
    position_seconds: currentTime,
    duration_seconds: duration,
    percent,
  });
}

export function trackSkip(
  track: Track,
  skipAtSeconds: number,
  duration: number,
): void {
  const percent = duration > 0 ? Math.min(100, (skipAtSeconds / duration) * 100) : 0;
  getPostHog()?.capture("track_skip", {
    track_id: track.id,
    track_title: track.title,
    skip_at_seconds: skipAtSeconds,
    skip_at_percent: percent,
    duration_seconds: duration,
  });
  postEvent({
    event_type: "track_skip",
    track_id: track.id,
    position_seconds: skipAtSeconds,
    duration_seconds: duration,
    percent,
  });
}

export function trackPlayComplete(track: Track, duration: number): void {
  getPostHog()?.capture("full_listen", {
    track_id: track.id,
    track_title: track.title,
    duration_seconds: duration,
  });
  postEvent({
    event_type: "full_listen",
    track_id: track.id,
    duration_seconds: duration,
    percent: 100,
  });
}

export function trackPause(track: Track, atSeconds: number): void {
  getPostHog()?.capture("track_pause", {
    track_id: track.id,
    pause_at_seconds: atSeconds,
  });
  postEvent({
    event_type: "track_pause",
    track_id: track.id,
    position_seconds: atSeconds,
  });
}

export function trackSeek(
  track: Track,
  fromSeconds: number,
  toSeconds: number,
): void {
  getPostHog()?.capture("track_seek", {
    track_id: track.id,
    from_seconds: fromSeconds,
    to_seconds: toSeconds,
    direction: toSeconds > fromSeconds ? "forward" : "backward",
  });
  postEvent({
    event_type: "track_seek",
    track_id: track.id,
    position_seconds: toSeconds,
    metadata: { from_seconds: fromSeconds },
  });
}

export function trackPurchaseIntent(
  trackId: string | null,
  albumId: string | null,
  fromPath: string,
): void {
  getPostHog()?.capture("purchase_intent", {
    track_id: trackId,
    album_id: albumId,
    from_path: fromPath,
  });
  postEvent({
    event_type: "purchase_intent",
    track_id: trackId,
    album_id: albumId,
    metadata: { from_path: fromPath },
  });
}

export function trackPurchaseComplete(
  orderId: string,
  items: unknown,
  total: number,
): void {
  getPostHog()?.capture("purchase_complete", {
    order_id: orderId,
    items,
    total,
  });
  postEvent({
    event_type: "purchase_complete",
    metadata: { order_id: orderId, items, total },
  });
}

export function trackSearch(query: string, resultsCount: number): void {
  getPostHog()?.capture("search", { query, results_count: resultsCount });
  postEvent({
    event_type: "search",
    query,
    metadata: { results_count: resultsCount },
  });
}

export function trackSwipe(
  direction: "left" | "right" | "up" | "down",
  fromPage: string,
  toPage: string,
  durationMs: number,
): void {
  getPostHog()?.capture("swipe", { direction, from: fromPage, to: toPage, duration_ms: durationMs });
  postEvent({
    event_type: "swipe",
    metadata: { direction, from: fromPage, to: toPage, duration_ms: durationMs },
  });
}

export function trackScrollDepth(page: string, depthPercent: number): void {
  getPostHog()?.capture("scroll_depth", { page, depth_percent: depthPercent });
  postEvent({
    event_type: "scroll_depth",
    percent: depthPercent,
    metadata: { page },
  });
}
