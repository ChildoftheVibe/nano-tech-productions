"use client";

import dynamic from "next/dynamic";
import { ArrowDown, ArrowRight, ArrowUp, ExternalLink } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const WorldMap = dynamic(() => import("./WorldMap").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center text-white/40">
      Loading map…
    </div>
  ),
});

export type Trend = "up" | "down" | "flat";

export type AnalyticsData = {
  overview: {
    totalPlaysAllTime: number;
    playsLast30: number;
    totalRevenue: number;
    uniqueListeners30d: number;
    avgListenSeconds: number;
    topCountry: string | null;
    completionsLast30: number;
  };
  countryCounts: Array<{ code: string; count: number }>;
  topTracks: Array<{ id: string; title: string; count: number; trend: Trend }>;
  topAlbums: Array<{ id: string; title: string; count: number; trend: Trend }>;
  topPurchased: Array<{ id: string; title: string; count: number; trend: Trend }>;
  avgSkipByAlbum: Array<{
    albumId: string;
    title: string;
    avgPercent: number;
    skipCount: number;
  }>;
  bestCompletion: Array<{
    trackId: string;
    title: string;
    albumTitle: string | null;
    plays: number;
    completes: number;
    rate: number;
  }>;
  worstCompletion: Array<{
    trackId: string;
    title: string;
    albumTitle: string | null;
    plays: number;
    completes: number;
    rate: number;
  }>;
  timeline: Array<{ date: string; plays: number; revenue: number }>;
  devices: Array<{ name: string; count: number }>;
  topBrowsers: Array<{ name: string; count: number }>;
  topCountries: Array<{ code: string; count: number }>;
  posthogProjectUrl: string | null;
};

const ACCENT = "#3DD6C8";
const ACCENT_2 = "#EB41DF";
const PIE_COLORS = ["#3DD6C8", "#EB41DF", "#FFC857", "#8AB6FF", "#9d9d9d"];

function formatMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatSeconds(s: number) {
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "up")
    return <ArrowUp size={12} className="inline text-emerald-400" />;
  if (trend === "down")
    return <ArrowDown size={12} className="inline text-red-400" />;
  return <ArrowRight size={12} className="inline text-white/40" />;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#222121] p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-white/40">{hint}</div>}
    </div>
  );
}

function Section({
  title,
  children,
  description,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      {description && (
        <p className="mb-4 text-sm text-white/50">{description}</p>
      )}
      {children}
    </section>
  );
}

function TopTable({
  rows,
  countLabel,
}: {
  rows: Array<{ id: string; title: string; count: number; trend: Trend }>;
  countLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#222121]">
      <table className="w-full text-sm">
        <thead className="bg-[#121212]/20 text-left text-xs uppercase tracking-wider text-white/50">
          <tr>
            <th className="w-10 px-4 py-2">#</th>
            <th className="px-4 py-2">Title</th>
            <th className="w-28 px-4 py-2">{countLabel}</th>
            <th className="w-16 px-4 py-2">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-white/40">
                No data yet
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-white/5">
                <td className="px-4 py-2 text-white/40">{i + 1}</td>
                <td className="px-4 py-2 truncate">{r.title}</td>
                <td className="px-4 py-2 font-medium">
                  {r.count.toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <TrendIcon trend={r.trend} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const TooltipBox: React.FC<{
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string; color?: string }>;
  label?: string | number;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-white/10 bg-[#1a1919] px-3 py-2 text-xs">
      <div className="text-white/60">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {String(p.value)}
        </div>
      ))}
    </div>
  );
};

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  return (
    <div>
      {/* SECTION 1 — OVERVIEW */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total plays"
          value={data.overview.totalPlaysAllTime.toLocaleString()}
          hint="All time"
        />
        <StatCard
          label="Plays · 30d"
          value={data.overview.playsLast30.toLocaleString()}
          hint={`${data.overview.completionsLast30} full listens`}
        />
        <StatCard
          label="Revenue"
          value={formatMoney(data.overview.totalRevenue)}
          hint="Last 90 days"
        />
        <StatCard
          label="Listeners · 30d"
          value={data.overview.uniqueListeners30d.toLocaleString()}
          hint="Unique sessions"
        />
        <StatCard
          label="Avg listen"
          value={formatSeconds(data.overview.avgListenSeconds)}
          hint="Per play attempt"
        />
        <StatCard
          label="Top country"
          value={data.overview.topCountry ?? "—"}
          hint={`${data.countryCounts[0]?.count ?? 0} sessions`}
        />
      </div>

      {/* SECTION 2 — WORLD MAP */}
      <Section
        title="Listeners by country"
        description="Sessions in the last 30 days. Hover for counts."
      >
        <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
          <WorldMap data={data.countryCounts} />
        </div>
      </Section>

      {/* SECTION 3 — TOP CONTENT */}
      <Section title="Top content" description="Last-7-day vs prior-7-day trend.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-medium text-white/70">
              Most played tracks
            </h3>
            <TopTable rows={data.topTracks} countLabel="Plays" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-white/70">
              Most viewed albums
            </h3>
            <TopTable rows={data.topAlbums} countLabel="Views (90d)" />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-white/70">
              Most purchased tracks
            </h3>
            <TopTable rows={data.topPurchased} countLabel="Sold" />
          </div>
        </div>
      </Section>

      {/* SECTION 4 — AUDIO ENGAGEMENT */}
      <Section title="Audio engagement">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
            <h3 className="mb-1 text-sm font-medium text-white/70">
              Average skip point per album
            </h3>
            <p className="mb-3 text-xs text-white/40">
              Lower = listeners bail earlier in the album.
            </p>
            {data.avgSkipByAlbum.length === 0 ? (
              <p className="py-8 text-center text-white/40">No skip data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, data.avgSkipByAlbum.length * 28)}>
                <BarChart
                  data={data.avgSkipByAlbum}
                  layout="vertical"
                  margin={{ left: 80, right: 16, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip content={<TooltipBox />} />
                  <Bar dataKey="avgPercent" fill={ACCENT_2} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
              <h3 className="mb-1 text-sm font-medium text-emerald-300">
                Best completion rates
              </h3>
              <ul className="divide-y divide-white/5 text-sm">
                {data.bestCompletion.length === 0 ? (
                  <li className="py-3 text-white/40">No data yet.</li>
                ) : (
                  data.bestCompletion.slice(0, 5).map((t) => (
                    <li
                      key={t.trackId}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="min-w-0 truncate pr-2">{t.title}</span>
                      <span className="font-mono text-emerald-300">{t.rate}%</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
              <h3 className="mb-1 text-sm font-medium text-red-300">
                Most skipped
              </h3>
              <p className="mb-2 text-xs text-white/40">
                Lowest completion rates among tracks with 3+ plays.
              </p>
              <ul className="divide-y divide-white/5 text-sm">
                {data.worstCompletion.length === 0 ? (
                  <li className="py-3 text-white/40">No data yet.</li>
                ) : (
                  data.worstCompletion.slice(0, 5).map((t) => (
                    <li
                      key={t.trackId}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="min-w-0 truncate pr-2">{t.title}</span>
                      <span className="font-mono text-red-300">{t.rate}%</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* SECTION 5 — POSTHOG EMBED */}
      <Section
        title="PostHog session replays + heatmaps"
        description="Granular replays and heatmap overlays live in PostHog. Click below to open."
      >
        <div className="rounded-lg border border-white/10 bg-[#222121] p-6">
          <div className="flex flex-wrap items-center gap-4">
            {data.posthogProjectUrl ? (
              <a
                href={data.posthogProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded bg-[#3DD6C8] px-4 py-2 text-sm font-medium text-[#121212]"
              >
                <ExternalLink size={14} /> Open PostHog dashboard
              </a>
            ) : (
              <a
                href="https://us.posthog.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded bg-[#3DD6C8] px-4 py-2 text-sm font-medium text-[#121212]"
              >
                <ExternalLink size={14} /> Open PostHog
              </a>
            )}
            <p className="text-sm text-white/60">
              To enable the live heatmap overlay on the public site, install the
              PostHog browser extension and toggle the toolbar while signed in
              to your PostHog account.
            </p>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Set <code className="rounded bg-[#121212]/30 px-1 py-0.5">POSTHOG_PROJECT_URL</code> in
            .env.local to deep-link directly into your project.
          </p>
        </div>
      </Section>

      {/* SECTION 6 — TIMELINE */}
      <Section title="90-day timeline">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
            <h3 className="mb-2 text-sm font-medium text-white/70">
              Daily plays
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip content={<TooltipBox />} />
                <Line
                  type="monotone"
                  dataKey="plays"
                  stroke={ACCENT}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
            <h3 className="mb-2 text-sm font-medium text-white/70">
              Daily revenue
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip content={<TooltipBox />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={ACCENT_2}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      {/* SECTION 7 — DEVICE BREAKDOWN */}
      <Section title="Audience breakdown">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
            <h3 className="mb-2 text-sm font-medium text-white/70">Devices</h3>
            {data.devices.length === 0 ? (
              <p className="py-12 text-center text-white/40">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.devices}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.devices.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
                  />
                  <Tooltip content={<TooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
            <h3 className="mb-2 text-sm font-medium text-white/70">
              Top countries
            </h3>
            {data.topCountries.length === 0 ? (
              <p className="py-12 text-center text-white/40">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topCountries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="code" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<TooltipBox />} />
                  <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
            <h3 className="mb-2 text-sm font-medium text-white/70">
              Top browsers
            </h3>
            {data.topBrowsers.length === 0 ? (
              <p className="py-12 text-center text-white/40">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topBrowsers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<TooltipBox />} />
                  <Bar dataKey="count" fill={ACCENT_2} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
