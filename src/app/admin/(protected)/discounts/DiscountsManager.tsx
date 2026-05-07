"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

export function DiscountsManager({ initialDiscounts, albums }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<
    | { kind: "list" }
    | { kind: "create" }
    | { kind: "edit"; discount: DiscountCode }
  >({ kind: "list" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const albumTitle = (id: string | null) =>
    id ? (albums.find((a) => a.id === id)?.title ?? "—") : "—";

  async function onDelete(discount: DiscountCode) {
    if (!confirm(`Delete code "${discount.code}"?`)) return;
    setDeletingId(discount.id);
    try {
      const res = await fetch(`/api/admin/discounts/${discount.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Delete failed: ${json.error ?? res.statusText}`);
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
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
        className="mb-4 rounded bg-[#3DD6C8] px-4 py-2 font-medium text-black"
      >
        + New discount
      </button>

      {initialDiscounts.length === 0 ? (
        <p className="text-white/60">No discount codes yet.</p>
      ) : (
        <ul className="space-y-2">
          {initialDiscounts.map((discount) => {
            const scope =
              discount.applies_to === "album"
                ? `${APPLIES_TO_LABEL.album}: ${albumTitle(discount.album_id)}`
                : APPLIES_TO_LABEL[discount.applies_to];
            const usage = discount.max_uses
              ? `${discount.current_uses}/${discount.max_uses} used`
              : `${discount.current_uses} used`;
            return (
              <li
                key={discount.id}
                className="flex items-center justify-between rounded border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <div className="font-medium">
                    {discount.code} · {discount.discount_percent}% off
                  </div>
                  <div className="text-sm text-white/60">
                    {scope} · expires {formatExpires(discount.expires_at)} ·{" "}
                    {usage} ·{" "}
                    {discount.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode({ kind: "edit", discount })}
                    className="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(discount)}
                    disabled={deletingId === discount.id}
                    className="rounded border border-red-500/40 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingId === discount.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
