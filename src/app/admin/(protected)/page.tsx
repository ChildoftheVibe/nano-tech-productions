import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Order = {
  id: string;
  customer_email: string | null;
  total: number | string;
  status: "pending" | "completed" | "failed";
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

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

function statusPill(status: Order["status"]) {
  const map: Record<Order["status"], string> = {
    completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${map[status]}`}
    >
      {status}
    </span>
  );
}

async function loadStats() {
  const now = new Date().toISOString();

  const [orders, completedOrders, discounts, tracks, recent] = await Promise.all([
    supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("orders")
      .select("total")
      .eq("status", "completed"),
    supabaseAdmin
      .from("discount_codes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("expires_at", now),
    supabaseAdmin
      .from("tracks")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabaseAdmin
      .from("orders")
      .select("id, customer_email, total, status, items, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const completedRows = (completedOrders.data ?? []) as Array<{
    total: number | string;
  }>;
  const revenue = completedRows.reduce((sum, r) => sum + Number(r.total ?? 0), 0);

  // Most-purchased track: aggregate from completed orders' items.
  const completedWithItems = await supabaseAdmin
    .from("orders")
    .select("items")
    .eq("status", "completed");

  const counts = new Map<string, { id: string; title: string; count: number }>();
  for (const row of (completedWithItems.data ?? []) as Array<{ items: unknown }>) {
    const items = Array.isArray(row.items) ? (row.items as ItemRow[]) : [];
    for (const it of items) {
      if (!it || it.type === "album") continue;
      const id = it.trackId ?? it.track_id;
      if (!id) continue;
      const qty = Number(it.quantity ?? 1);
      const prev = counts.get(id);
      counts.set(id, {
        id,
        title: it.title ?? prev?.title ?? "(untitled)",
        count: (prev?.count ?? 0) + qty,
      });
    }
  }

  let topTrack: { id: string; title: string; count: number } | null = null;
  for (const t of counts.values()) {
    if (!topTrack || t.count > topTrack.count) topTrack = t;
  }

  return {
    orderCount: orders.count ?? 0,
    revenue,
    activeDiscounts: discounts.count ?? 0,
    publishedTracks: tracks.count ?? 0,
    topTrack,
    recent: (recent.data ?? []) as Order[],
  };
}

function summarizeItems(items: unknown): string {
  if (!Array.isArray(items)) return "—";
  const list = items as ItemRow[];
  const total = list.reduce((sum, it) => sum + Number(it.quantity ?? 1), 0);
  if (list.length === 0) return "—";
  if (list.length === 1) return list[0].title ?? `${total} item${total === 1 ? "" : "s"}`;
  return `${list[0].title ?? "Item"} +${list.length - 1} more`;
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

export default async function AdminDashboard() {
  const stats = await loadStats();

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total orders"
          value={stats.orderCount.toLocaleString()}
          hint={`Revenue ${formatMoney(stats.revenue)}`}
        />
        <StatCard
          label="Active discounts"
          value={stats.activeDiscounts.toLocaleString()}
          hint="Currently usable"
        />
        <StatCard
          label="Published tracks"
          value={stats.publishedTracks.toLocaleString()}
          hint="Visible to fans"
        />
        <StatCard
          label="Most purchased"
          value={stats.topTrack?.title ?? "—"}
          hint={
            stats.topTrack
              ? `${stats.topTrack.count} sold`
              : "No completed sales yet"
          }
        />
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="text-sm text-[#3DD6C8] hover:underline"
          >
            View all →
          </Link>
        </div>

        {stats.recent.length === 0 ? (
          <p className="text-white/60">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#222121]">
            <table className="w-full text-sm">
              <thead className="bg-black/20 text-left text-xs uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.recent.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-white/80">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {o.customer_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {summarizeItems(o.items)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatMoney(Number(o.total))}
                    </td>
                    <td className="px-4 py-3">{statusPill(o.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
