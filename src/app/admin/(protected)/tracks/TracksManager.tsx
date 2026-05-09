"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { TrackForm } from "@/components/admin/TrackForm";
import type { Album, Track } from "@/lib/db-types";

type Props = {
  initialTracks: Track[];
  albums: Pick<Album, "id" | "title" | "slug">[];
  page: number;
  totalPages: number;
  totalCount: number;
  albumFilter: string;
};

export function TracksManager({
  initialTracks,
  albums,
  page,
  totalPages,
  totalCount,
  albumFilter,
}: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<
    { kind: "list" } | { kind: "create" } | { kind: "edit"; track: Track }
  >({ kind: "list" });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>(initialTracks);

  const albumTitle = (id: string | null) =>
    id ? (albums.find((a) => a.id === id)?.title ?? "—") : "—";

  function onChangeFilter(value: string) {
    const params = new URLSearchParams(search.toString());
    if (value) params.set("album", value);
    else params.delete("album");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?");
  }

  async function onTogglePublish(track: Track) {
    setPendingId(track.id);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_published: !track.is_published }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Update failed: ${json.error ?? res.statusText}`);
        return;
      }
      setTracks((prev) =>
        prev.map((t) =>
          t.id === track.id ? { ...t, is_published: !t.is_published } : t,
        ),
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function onDelete(track: Track) {
    if (!confirm(`Delete "${track.title}"?`)) return;
    setPendingId(track.id);
    try {
      const res = await fetch(`/api/admin/tracks/${track.id}`, {
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
        <h2 className="mb-4 text-lg font-medium">New track</h2>
        <TrackForm
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
        <h2 className="mb-4 text-lg font-medium">Edit track</h2>
        <TrackForm
          initial={mode.track}
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

  const pageHref = (n: number) => {
    const params = new URLSearchParams(search.toString());
    params.set("page", String(n));
    return `?${params.toString()}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setMode({ kind: "create" })}
          className="rounded bg-[#3DD6C8] px-4 py-2 font-medium text-black"
        >
          + Add track
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-white/60">Album:</span>
          <select
            value={albumFilter}
            onChange={(e) => onChangeFilter(e.target.value)}
            className="rounded border border-white/15 bg-[#222121] px-2 py-1.5 outline-none focus:border-[#3DD6C8]"
          >
            <option value="">All albums</option>
            <option value="none">— No album (singles)</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tracks.length === 0 ? (
        <p className="text-white/60">No tracks found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#222121]">
            <table className="w-full text-sm">
              <thead className="bg-black/20 text-left text-xs uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Album</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Downloadable</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tracks.map((track) => {
                  const pending = pendingId === track.id;
                  return (
                    <tr key={track.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white/50">
                        {track.track_number ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{track.title}</div>
                        <div className="text-xs text-white/50">
                          {track.duration ?? "—"}
                          {track.features && track.features.length > 0
                            ? ` · feat. ${track.features.join(", ")}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {albumTitle(track.album_id)}
                      </td>
                      <td className="px-4 py-3">${Number(track.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-white/70">
                        {track.is_downloadable ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onTogglePublish(track)}
                          disabled={pending}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                            track.is_published
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                          } disabled:opacity-50`}
                        >
                          {track.is_published ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setMode({ kind: "edit", track })}
                            className="rounded border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(track)}
                            disabled={pending}
                            className="rounded border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
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

          <div className="mt-6 flex items-center justify-between text-sm text-white/70">
            <span>
              Page {page} of {totalPages} · {totalCount} total
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
