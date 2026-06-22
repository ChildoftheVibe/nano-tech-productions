"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Music, Plus } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import { InstrumentalForm } from "@/components/admin/InstrumentalForm";
import type { Album, Instrumental } from "@/lib/db-types";

type Props = {
  initial: Instrumental[];
  albums: Pick<Album, "id" | "title" | "slug">[];
  page: number;
  totalPages: number;
  totalCount: number;
  albumFilter: string;
  typeFilter: "" | "single" | "album_track";
};

export function SoundsManager({
  initial,
  albums,
  page,
  totalPages,
  totalCount,
  albumFilter,
  typeFilter,
}: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<
    { kind: "list" } | { kind: "create" } | { kind: "edit"; row: Instrumental }
  >({ kind: "list" });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [items, setItems] = useState<Instrumental[]>(initial);

  const albumTitle = (id: string | null) =>
    id ? (albums.find((a) => a.id === id)?.title ?? "—") : "—";

  function updateFilter(key: "album" | "type", value: string) {
    const params = new URLSearchParams(search.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?");
  }

  async function onTogglePublish(row: Instrumental) {
    setPendingId(row.id);
    try {
      const res = await adminFetch(`/api/admin/instrumentals/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_published: !row.is_published }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Update failed: ${json.error ?? res.statusText}`);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.id === row.id ? { ...i, is_published: !i.is_published } : i,
        ),
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function onDelete(row: Instrumental) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    setPendingId(row.id);
    try {
      const res = await adminFetch(`/api/admin/instrumentals/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Delete failed: ${json.error ?? res.statusText}`);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== row.id));
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (mode.kind === "create") {
    return (
      <InstrumentalForm
        albums={albums}
        onSaved={(saved) => {
          setItems((prev) => [saved, ...prev]);
          setMode({ kind: "list" });
          router.refresh();
        }}
        onCancel={() => setMode({ kind: "list" })}
      />
    );
  }
  if (mode.kind === "edit") {
    return (
      <InstrumentalForm
        initial={mode.row}
        albums={albums}
        onSaved={(saved) => {
          setItems((prev) =>
            prev.map((i) => (i.id === saved.id ? saved : i)),
          );
          setMode({ kind: "list" });
          router.refresh();
        }}
        onCancel={() => setMode({ kind: "list" })}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-white/70">
            Type
            <select
              value={typeFilter}
              onChange={(e) => updateFilter("type", e.target.value)}
              className="ml-2 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="single">Singles</option>
              <option value="album_track">Album Tracks</option>
            </select>
          </label>
          <label className="text-xs text-white/70">
            Album
            <select
              value={albumFilter}
              onChange={(e) => updateFilter("album", e.target.value)}
              className="ml-2 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="none">— (no album)</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          <span className="text-xs text-white/50">{totalCount} total</span>
        </div>
        <button
          type="button"
          onClick={() => setMode({ kind: "create" })}
          className="inline-flex items-center gap-2 rounded bg-[#3DD6C8] px-3 py-1.5 text-sm font-bold text-black"
        >
          <Plus size={14} /> Add Instrumental
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded border border-white/10 bg-black/30 p-8 text-center">
          <Music size={28} className="mx-auto mb-2 text-[#3DD6C8]" />
          <p className="text-sm text-white/70">No instrumentals yet.</p>
          <button
            type="button"
            onClick={() => setMode({ kind: "create" })}
            className="mt-3 inline-flex items-center gap-2 rounded bg-[#3DD6C8] px-3 py-1.5 text-sm font-bold text-black"
          >
            <Plus size={14} /> Add your first instrumental
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-white/10">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-black/40 text-left text-[11px] uppercase tracking-wider text-white/60">
              <tr>
                <th scope="col" className="px-3 py-2">Cover</th>
                <th scope="col" className="px-3 py-2">Title</th>
                <th scope="col" className="px-3 py-2">Type</th>
                <th scope="col" className="px-3 py-2">Album</th>
                <th scope="col" className="px-3 py-2">Price</th>
                <th scope="col" className="px-3 py-2">Published</th>
                <th scope="col" className="px-3 py-2">Downloads</th>
                <th scope="col" className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    {row.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.cover_image}
                        alt={`${row.title} cover`}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-white/5 text-white/30">
                        <Music size={16} aria-hidden="true" />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.title}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-[#3DD6C8]/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#3DD6C8]">
                      {row.type === "album_track" ? "Album Track" : "Single"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/70">
                    {albumTitle(row.album_id)}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    ${Number(row.price).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onTogglePublish(row)}
                      disabled={pendingId === row.id}
                      aria-pressed={row.is_published}
                      className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        row.is_published
                          ? "bg-[#3DD6C8]/20 text-[#3DD6C8]"
                          : "bg-white/5 text-white/50"
                      }`}
                    >
                      {row.is_published ? "Live" : "Draft"}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.download_count ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setMode({ kind: "edit", row })}
                        className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/5"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        disabled={pendingId === row.id}
                        className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-xs text-white/60">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(search.toString());
                  params.set("page", String(page - 1));
                  router.push(`?${params.toString()}`);
                }}
                className="rounded border border-white/15 px-2 py-1 hover:bg-white/5"
              >
                Prev
              </button>
            ) : null}
            {page < totalPages ? (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(search.toString());
                  params.set("page", String(page + 1));
                  router.push(`?${params.toString()}`);
                }}
                className="rounded border border-white/15 px-2 py-1 hover:bg-white/5"
              >
                Next
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
