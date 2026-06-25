"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { DiscountForm } from "@/components/admin/DiscountForm";
import type { Album, DiscountCode } from "@/lib/db-types";

type Props = {
  initialDiscounts: DiscountCode[];
  albums: Pick<Album, "id" | "title">[];
};

const APPLIES_TO_LABEL: Record<DiscountCode["applies_to"], string> = {
  all: "All purchases",
  single: "Single tracks",
  album: "Specific album",
};

function formatExpires(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function statusOf(d: DiscountCode): "active" | "inactive" | "expired" | "exhausted" {
  if (!d.is_active) return "inactive";
  if (new Date(d.expires_at).getTime() <= Date.now()) return "expired";
  if (d.max_uses !== null && d.current_uses >= d.max_uses) return "exhausted";
  return "active";
}

export function DiscountsManager({ initialDiscounts, albums }: Props) {
  const router = useRouter();
  const [discounts, setDiscounts] = useState<DiscountCode[]>(initialDiscounts);
  const [mode, setMode] = useState<
    | { kind: "list" }
    | { kind: "create" }
    | { kind: "edit"; discount: DiscountCode }
  >({ kind: "list" });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const albumTitle = (id: string | null) =>
    id ? (albums.find((a) => a.id === id)?.title ?? "—") : "—";

  async function onToggleActive(discount: DiscountCode) {
    setPendingId(discount.id);
    try {
      const res = await adminFetch(`/api/admin/discounts/${discount.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !discount.is_active }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Update failed: ${json.error ?? res.statusText}`);
        return;
      }
      setDiscounts((prev) =>
        prev.map((d) =>
          d.id === discount.id ? { ...d, is_active: !d.is_active } : d,
        ),
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function onDelete(discount: DiscountCode) {
    if (!confirm(`Delete code "${discount.code}"?`)) return;
    setPendingId(discount.id);
    try {
      const res = await adminFetch(`/api/admin/discounts/${discount.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Delete failed: ${json.error ?? res.statusText}`);
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (mode.kind === "create") {
    return (
      <div className="max-w-2xl">
        <h2 className="mb-4 text-lg font-medium">New discount</h2>
        <DiscountForm
          albums={albums}
          onSaved={() => {
            setMode({ kind: "list" });
            router.refresh();
          }}
          onCancel={() => setMode({ kind: "list" })}
        />
      </div>
    );
  }

  if (mode.kind === "edit") {
    return (
      <div className="max-w-2xl">
        <h2 className="mb-4 text-lg font-medium">Edit discount</h2>
        <DiscountForm
          initial={mode.discount}
          albums={albums}
          onSaved={() => {
            setMode({ kind: "list" });
            router.refresh();
          }}
          onCancel={() => setMode({ kind: "list" })}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setMode({ kind: "create" })}
        className="mb-4 rounded-full bg-[#3DD6C8] px-4 py-2 font-medium text-black"
      >
        + Create code
      </button>

      {discounts.length === 0 ? (
        <p className="text-white/60">No discount codes yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#222121]">
          <table className="w-full text-sm">
            <thead className="bg-black/20 text-left text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Off</th>
                <th className="px-4 py-3">Applies to</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {discounts.map((discount) => {
                const pending = pendingId === discount.id;
                const status = statusOf(discount);
                const scope =
                  discount.applies_to === "album"
                    ? `${APPLIES_TO_LABEL.album}: ${albumTitle(discount.album_id)}`
                    : APPLIES_TO_LABEL[discount.applies_to];
                const usage = discount.max_uses
                  ? `${discount.current_uses}/${discount.max_uses}`
                  : `${discount.current_uses} / ∞`;

                const statusClass =
                  status === "active"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : status === "expired"
                      ? "bg-red-500/15 text-red-300 border-red-500/30"
                      : status === "exhausted"
                        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                        : "bg-white/5 text-white/50 border-white/15";

                return (
                  <tr key={discount.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono font-medium">
                      {discount.code}
                    </td>
                    <td className="px-4 py-3">{discount.discount_percent}%</td>
                    <td className="px-4 py-3 text-white/70">{scope}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-white/70">
                      {formatExpires(discount.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-white/70">{usage}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${statusClass}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setMode({ kind: "edit", discount })}
                          className="rounded-full border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onToggleActive(discount)}
                          disabled={pending}
                          className="rounded-full border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
                        >
                          {discount.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => onDelete(discount)}
                          disabled={pending}
                          className="rounded-full border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
