"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrackForm } from "@/components/admin/TrackForm";
import type { Album, Track } from "@/lib/db-types";

type Props = {
  initialTracks: Track[];
  albums: Pick<Album, "id" | "title">[];
  page: number;
  totalPages: number;
  totalCount: number;
};

export function TracksManager({
  initialTracks,
  albums,
  page,
  totalPages,
  totalCount,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<
    { kind: "list" } | { kind: "create" } | { kind: "edit"; track: Track }
  >({ kind: "list" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const albumTitle = (id: string | null) =>
    id ? (albums.find((a) => a.id === id)?.title ?? "—") : "—";

  async function onDelete(track: Track) {
    if (!confirm(`Delete "${track.title}"?`)) return;
    setDeletingId(track.id);
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
      setDeletingId(null);
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

  return (
    <div>
      <button
        onClick={() => setMode({ kind: "create" })}
        className="mb-4 rounded bg-[#3DD6C8] px-4 py-2 font-medium text-black"
      >
        + New track
      </button>

      {initialTracks.length === 0 ? (
        <p className="text-white/60">No tracks yet.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {initialTracks.map((track) => (
              <li
                key={track.id}
                className="flex items-center justify-between rounded border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <div className="font-medium">{track.title}</div>
                  <div className="text-sm text-white/60">
                    {albumTitle(track.album_id)} · ${track.price.toFixed(2)} ·{" "}
                    {track.is_published ? "Published" : "Unpublished"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode({ kind: "edit", track })}
                    className="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(track)}
                    disabled={deletingId === track.id}
                    className="rounded border border-red-500/40 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingId === track.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between text-sm text-white/70">
            <span>
              Page {page} of {totalPages} · {totalCount} total
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`?page=${page - 1}`}
                  className="rounded border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={`?page=${page + 1}`}
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
