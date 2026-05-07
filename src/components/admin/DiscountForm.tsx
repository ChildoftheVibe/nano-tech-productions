"use client";

import { useState } from "react";
import type {
  Album,
  DiscountAppliesTo,
  DiscountCode,
} from "@/lib/db-types";

type Props = {
  initial?: DiscountCode;
  albums: Pick<Album, "id" | "title">[];
  onSaved?: (discount: DiscountCode) => void;
  onCancel?: () => void;
};

type FormState = {
  code: string;
  discount_percent: string;
  applies_to: DiscountAppliesTo;
  album_id: string;
  expires_at: string;
  max_uses: string;
  is_active: boolean;
};

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function emptyForm(): FormState {
  return {
    code: "",
    discount_percent: "10",
    applies_to: "all",
    album_id: "",
    expires_at: "",
    max_uses: "",
    is_active: true,
  };
}

function fromDiscount(d: DiscountCode): FormState {
  return {
    code: d.code,
    discount_percent: d.discount_percent.toString(),
    applies_to: d.applies_to,
    album_id: d.album_id ?? "",
    expires_at: d.expires_at ? toLocalDateTime(d.expires_at) : "",
    max_uses: d.max_uses?.toString() ?? "",
    is_active: d.is_active,
  };
}

export function DiscountForm({ initial, albums, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() =>
    initial ? fromDiscount(initial) : emptyForm(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_percent: Number(form.discount_percent),
        applies_to: form.applies_to,
        album_id: form.applies_to === "album" ? form.album_id || null : null,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        is_active: form.is_active,
      };
      const url = initial
        ? `/api/admin/discounts/${initial.id}`
        : "/api/admin/discounts";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      onSaved?.(json.discount);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-white">
      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Code</span>
        <input
          required
          value={form.code}
          onChange={(e) => set("code", e.target.value)}
          placeholder="SUMMER25"
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 uppercase outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Discount %</span>
        <input
          required
          type="number"
          min="1"
          max="100"
          value={form.discount_percent}
          onChange={(e) => set("discount_percent", e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Applies to</span>
        <select
          value={form.applies_to}
          onChange={(e) =>
            set("applies_to", e.target.value as DiscountAppliesTo)
          }
          className="w-full rounded border border-white/20 bg-[#393838] px-3 py-2 outline-none focus:border-[#3DD6C8]"
        >
          <option value="all">All purchases</option>
          <option value="single">Single tracks</option>
          <option value="album">Specific album</option>
        </select>
      </label>

      {form.applies_to === "album" && (
        <label className="block">
          <span className="mb-1 block text-sm text-white/70">Album</span>
          <select
            required
            value={form.album_id}
            onChange={(e) => set("album_id", e.target.value)}
            className="w-full rounded border border-white/20 bg-[#393838] px-3 py-2 outline-none focus:border-[#3DD6C8]"
          >
            <option value="">— Select album —</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Expires at</span>
        <input
          required
          type="datetime-local"
          value={form.expires_at}
          onChange={(e) => set("expires_at", e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">
          Max uses (blank = unlimited)
        </span>
        <input
          type="number"
          min="1"
          value={form.max_uses}
          onChange={(e) => set("max_uses", e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
        />
        <span className="text-sm">Active</span>
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-[#3DD6C8] px-4 py-2 font-medium text-black disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Create discount"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-white/20 px-4 py-2 text-white/80 hover:bg-white/5"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
