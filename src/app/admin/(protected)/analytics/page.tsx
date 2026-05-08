import { supabaseAdmin } from "@/lib/supabase";
import { AnalyticsClient, type AnalyticsData } from "./AnalyticsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NOW = () => new Date();
const daysAgo = (n: number) => {
  const d = NOW();
  d.setDate(d.getDate() - n);
  return d;
};

type EventRow = {
  id: string;
  session_id: string;
  event_type: string;
  track_id: string | null;
  album_id: string | null;
  position_seconds: number | null;
  duration_seconds: number | null;
  percent: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SessionRow = {
  session_id: string;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  total_listen_seconds: number | null;
};

type OrderRow = {
  id: string;
  total: number | string;
  status: string;
  items: unknown;
  created_at: string;
};

type ItemRow = {
  type?: string;
  trackId?: string;
  track_id?: string;
  title?: string;
  quantity?: number;
};

async function loadAnalytics(): Promise<AnalyticsData> {
  const since30 = daysAgo(30).toISOString();
  const since60 = daysAgo(60).toISOString();
  const since90 = daysAgo(90).toISOString();
  const since7 = daysAgo(7).toISOString();
  const since14 = daysAgo(14).toISOString();

  const [
    eventsRecent,
    sessions30,
    ordersAll,
    tracksAll,
    albumsAll,
  ] = await Promise.all([
    supabaseAdmin
      .from("analytics_events")
      .select("id, session_id, event_type, track_id, album_id, position_seconds, duration_seconds, percent, metadata, created_at")
      .gte("created_at", since90)
      .limit(50000),
    supabaseAdmin
      .from("analytics_sessions")
      .select("session_id, country, device_type, browser, total_listen_seconds")
      .gte("first_seen", since30),
    supabaseAdmin
      .from("orders")
      .select("id, total, status, items, created_at")
      .gte("created_at", since90)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("tracks")
      .select("id, title, play_count, album_id, albums(title)"),
    supabaseAdmin.from("albums").select("id, title"),
  ]);

  const events = (eventsRecent.data ?? []) as EventRow[];
  const sessions = (sessions30.data ?? []) as SessionRow[];
  const orders = (ordersAll.data ?? []) as OrderRow[];
  type TrackRow = {
    id: string;
    title: string;
    play_count: number | null;
    album_id: string | null;
    albums: { title: string } | { title: string }[] | null;
  };
  const tracks = (tracksAll.data ?? []) as TrackRow[];
  const albums = (albumsAll.data ?? []) as Array<{ id: string; title: string }>;
  const albumTitleById = new Map(albums.map((a) => [a.id, a.title]));
  const trackById = new Map(
    tracks.map((t) => [
      t.id,
      {
        title: t.title,
        albumTitle:
          (Array.isArray(t.albums) ? t.albums[0]?.title : t.albums?.title) ??
          (t.album_id ? albumTitleById.get(t.album_id) : null),
      },
    ]),
  );

  // ── Overview cards ──────────────────────────────────────
  const totalPlaysAll = tracks.reduce(
    (sum, t) => sum + Number(t.play_count ?? 0),
    0,
  );
  const playsLast30 = events.filter(
    (e) => e.event_type === "play_start" && e.created_at >= since30,
  ).length;
  const completionsLast30 = events.filter(
    (e) => e.event_type === "full_listen" && e.created_at >= since30,
  ).length;
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalRevenue = completedOrders.reduce(
    (sum, o) => sum + Number(o.total ?? 0),
    0,
  );
  const uniqueListeners = new Set(
    events
      .filter(
        (e) => e.event_type === "play_start" && e.created_at >= since30,
      )
      .map((e) => e.session_id),
  ).size;

  // Avg listen duration: average position_seconds across full_listen + skip events.
  const listenDurations = events
    .filter(
      (e) =>
        (e.event_type === "full_listen" || e.event_type === "track_skip") &&
        typeof e.position_seconds === "number",
    )
    .map((e) =>
      e.event_type === "full_listen"
        ? Number(e.duration_seconds ?? e.position_seconds ?? 0)
        : Number(e.position_seconds ?? 0),
    );
  const avgListenSeconds =
    listenDurations.length > 0
      ? listenDurations.reduce((a, b) => a + b, 0) / listenDurations.length
      : 0;

  const countryCounts = new Map<string, number>();
  for (const s of sessions) {
    if (!s.country) continue;
    countryCounts.set(s.country, (countryCounts.get(s.country) ?? 0) + 1);
  }
  let topCountry: string | null = null;
  let topCountryCount = 0;
  for (const [c, n] of countryCounts) {
    if (n > topCountryCount) {
      topCountry = c;
      topCountryCount = n;
    }
  }

  // ── Top content ────────────────────────────────────────
  const playsByTrackRecent = new Map<string, number>();
  const playsByTrackPrior = new Map<string, number>();
  const viewsByAlbumRecent = new Map<string, number>();
  const viewsByAlbumPrior = new Map<string, number>();

  for (const e of events) {
    if (e.event_type === "play_start" && e.track_id) {
      if (e.created_at >= since7) {
        playsByTrackRecent.set(
          e.track_id,
          (playsByTrackRecent.get(e.track_id) ?? 0) + 1,
        );
      } else if (e.created_at >= since14) {
        playsByTrackPrior.set(
          e.track_id,
          (playsByTrackPrior.get(e.track_id) ?? 0) + 1,
        );
      }
    }
    if (e.event_type === "album_view" && e.album_id) {
      if (e.created_at >= since7) {
        viewsByAlbumRecent.set(
          e.album_id,
          (viewsByAlbumRecent.get(e.album_id) ?? 0) + 1,
        );
      } else if (e.created_at >= since14) {
        viewsByAlbumPrior.set(
          e.album_id,
          (viewsByAlbumPrior.get(e.album_id) ?? 0) + 1,
        );
      }
    }
  }

  const trendArrow = (recent: number, prior: number): "up" | "down" | "flat" => {
    if (recent > prior) return "up";
    if (recent < prior) return "down";
    return "flat";
  };

  const topTracks = tracks
    .map((t) => ({
      id: t.id,
      title: t.title,
      count: Number(t.play_count ?? 0),
      trend: trendArrow(
        playsByTrackRecent.get(t.id) ?? 0,
        playsByTrackPrior.get(t.id) ?? 0,
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topAlbums = albums
    .map((a) => {
      const recent = viewsByAlbumRecent.get(a.id) ?? 0;
      const prior = viewsByAlbumPrior.get(a.id) ?? 0;
      const allTime = events.filter(
        (e) => e.event_type === "album_view" && e.album_id === a.id,
      ).length;
      return {
        id: a.id,
        title: a.title,
        count: allTime,
        trend: trendArrow(recent, prior),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const purchaseCounts = new Map<
    string,
    { id: string; title: string; count: number }
  >();
  for (const o of completedOrders) {
    if (!Array.isArray(o.items)) continue;
    for (const it of o.items as ItemRow[]) {
      if (!it || it.type === "album") continue;
      const id = it.trackId ?? it.track_id;
      if (!id) continue;
      const qty = Number(it.quantity ?? 1);
      const prev = purchaseCounts.get(id);
      purchaseCounts.set(id, {
        id,
        title: it.title ?? prev?.title ?? trackById.get(id)?.title ?? "(unknown)",
        count: (prev?.count ?? 0) + qty,
      });
    }
  }
  const topPurchased = Array.from(purchaseCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((p) => ({ ...p, trend: "flat" as const }));

  // ── Audio engagement ───────────────────────────────────
  // Average skip-point per album.
  const albumSkipBuckets = new Map<string, number[]>();
  for (const e of events) {
    if (e.event_type !== "track_skip" || !e.track_id || e.percent === null) continue;
    const albumId =
      tracks.find((t) => t.id === e.track_id)?.album_id ?? null;
    if (!albumId) continue;
    const arr = albumSkipBuckets.get(albumId) ?? [];
    arr.push(Number(e.percent));
    albumSkipBuckets.set(albumId, arr);
  }
  const avgSkipByAlbum = Array.from(albumSkipBuckets.entries())
    .map(([albumId, pcts]) => {
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      return {
        albumId,
        title: albumTitleById.get(albumId) ?? "(unknown)",
        avgPercent: Math.round(avg),
        skipCount: pcts.length,
      };
    })
    .sort((a, b) => a.avgPercent - b.avgPercent)
    .slice(0, 12);

  // Completion rate per track: full_listen / play_start.
  const playsByTrack = new Map<string, number>();
  const completesByTrack = new Map<string, number>();
  for (const e of events) {
    if (!e.track_id) continue;
    if (e.event_type === "play_start") {
      playsByTrack.set(e.track_id, (playsByTrack.get(e.track_id) ?? 0) + 1);
    } else if (e.event_type === "full_listen") {
      completesByTrack.set(
        e.track_id,
        (completesByTrack.get(e.track_id) ?? 0) + 1,
      );
    }
  }
  const completionRates = Array.from(playsByTrack.entries())
    .filter(([, plays]) => plays >= 3)
    .map(([trackId, plays]) => {
      const completes = completesByTrack.get(trackId) ?? 0;
      const meta = trackById.get(trackId);
      return {
        trackId,
        title: meta?.title ?? "(unknown)",
        albumTitle: meta?.albumTitle ?? null,
        plays,
        completes,
        rate: Math.round((completes / plays) * 100),
      };
    });
  const bestCompletion = [...completionRates]
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
  const worstCompletion = [...completionRates]
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 10);

  // ── Listener timeline (90 days) ────────────────────────
  const dayKey = (iso: string) => iso.slice(0, 10);
  const playsByDay = new Map<string, number>();
  for (const e of events) {
    if (e.event_type !== "play_start") continue;
    const d = dayKey(e.created_at);
    playsByDay.set(d, (playsByDay.get(d) ?? 0) + 1);
  }
  const revenueByDay = new Map<string, number>();
  for (const o of completedOrders) {
    const d = dayKey(o.created_at);
    revenueByDay.set(d, (revenueByDay.get(d) ?? 0) + Number(o.total ?? 0));
  }

  const timeline: Array<{ date: string; plays: number; revenue: number }> = [];
  for (let i = 89; i >= 0; i--) {
    const date = daysAgo(i).toISOString().slice(0, 10);
    timeline.push({
      date,
      plays: playsByDay.get(date) ?? 0,
      revenue: Number((revenueByDay.get(date) ?? 0).toFixed(2)),
    });
  }
  void since60; // reserved for future trend windows

  // ── Device / geo breakdown ─────────────────────────────
  const deviceCounts = new Map<string, number>();
  const browserCounts = new Map<string, number>();
  for (const s of sessions) {
    const d = s.device_type ?? "unknown";
    deviceCounts.set(d, (deviceCounts.get(d) ?? 0) + 1);
    if (s.browser) {
      browserCounts.set(s.browser, (browserCounts.get(s.browser) ?? 0) + 1);
    }
  }

  const devices = Array.from(deviceCounts.entries()).map(([name, count]) => ({
    name,
    count,
  }));
  const topBrowsers = Array.from(browserCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topCountries = Array.from(countryCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    overview: {
      totalPlaysAllTime: totalPlaysAll,
      playsLast30,
      totalRevenue,
      uniqueListeners30d: uniqueListeners,
      avgListenSeconds: Math.round(avgListenSeconds),
      topCountry,
      completionsLast30,
    },
    countryCounts: Array.from(countryCounts.entries()).map(([code, count]) => ({
      code,
      count,
    })),
    topTracks,
    topAlbums,
    topPurchased,
    avgSkipByAlbum,
    bestCompletion,
    worstCompletion,
    timeline,
    devices,
    topBrowsers,
    topCountries,
    posthogProjectUrl: process.env.POSTHOG_PROJECT_URL ?? null,
  };
}

export default async function AdminAnalyticsPage() {
  const data = await loadAnalytics();

  return (
    <main className="p-8">
      <h1 className="mb-2 text-2xl font-semibold">Analytics</h1>
      <p className="mb-6 text-sm text-white/60">
        First-party engagement data, last 90 days. PostHog handles session
        replays and heatmaps; data here is computed from your own database.
      </p>
      <AnalyticsClient data={data} />
    </main>
  );
}
