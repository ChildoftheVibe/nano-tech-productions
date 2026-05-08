import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type OrderStatus = "pending" | "completed" | "failed";

type Order = {
  id: string;
  paypal_order_id: string;
  customer_email: string | null;
  items: unknown;
  subtotal: number | string;
  discount_amount: number | string;
  total: number | string;
  discount_code: string | null;
  status: OrderStatus;
  created_at: string;
};

type ItemRow = {
  type?: string;
  title?: string;
  quantity?: number;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatMoney(n: number | string) {
  return `$${Number(n ?? 0).toFixed(2)}`;
}

function summarizeItems(items: unknown): string {
  if (!Array.isArray(items)) return "—";
  const list = items as ItemRow[];
  if (list.length === 0) return "—";
  return list
    .map((it) => `${it.title ?? "Item"}${it.quantity && it.quantity > 1 ? ` × ${it.quantity}` : ""}`)
    .join(", ");
}

function StatusPill({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, string> = {
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

type SearchParams = Promise<{ page?: string; status?: string }>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page: pageStr, status } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1") || 1);
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  let q = supabaseAdmin
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, end);

  if (status === "completed" || status === "pending" || status === "failed") {
    q = q.eq("status", status);
  }

  const { data, count, error } = await q;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const orders = (data ?? []) as Order[];

  const filterHref = (s?: string) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Orders</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { label: "All", value: undefined },
          { label: "Completed", value: "completed" },
          { label: "Pending", value: "pending" },
          { label: "Failed", value: "failed" },
        ].map((o) => {
          const active = (o.value ?? "") === (status ?? "");
          return (
            <Link
              key={o.label}
              href={filterHref(o.value)}
              className={`rounded-full border px-3 py-1 text-xs ${
                active
                  ? "border-[#3DD6C8] bg-[#3DD6C8]/10 text-[#3DD6C8]"
                  : "border-white/15 text-white/60 hover:border-white/30 hover:text-white"
              }`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>

      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : orders.length === 0 ? (
        <p className="text-white/60">No orders found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#222121]">
            <table className="w-full text-sm">
              <thead className="bg-black/20 text-left text-xs uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">PayPal ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Subtotal</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-white/80">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/60">
                      {o.paypal_order_id.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {o.customer_email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {summarizeItems(o.items)}
                    </td>
                    <td className="px-4 py-3">{formatMoney(o.subtotal)}</td>
                    <td className="px-4 py-3 text-white/70">
                      {Number(o.discount_amount) > 0
                        ? `-${formatMoney(o.discount_amount)}${o.discount_code ? ` (${o.discount_code})` : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatMoney(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-white/70">
            <span>
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`?page=${page - 1}${status ? `&status=${status}` : ""}`}
                  className="rounded border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={`?page=${page + 1}${status ? `&status=${status}` : ""}`}
                  className="rounded border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
