"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";
import { useState } from "react";
import { AlbumForm } from "@/components/admin/AlbumForm";
import type { Album } from "@/lib/db-types";

type Props = {
  initialAlbums: AlbumWithTrackCount[];
  page: number;
  totalPages: number;
  totalCount: number;
};

export type AlbumWithTrackCount = Album & { track_count: number };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export function AlbumsManager({
  initialAlbums,
  page,
  totalPages,
  totalCount,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<
    { kind: "list" } | { kind: "create" } | { kind: "edit"; album: Album }
  >({ kind: "list" });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [albums, setAlbums] = useState<AlbumWithTrackCount[]>(initialAlbums);

  async function onTogglePublish(album: AlbumWithTrackCount) {
    setPendingId(album.id);
    try {
      const res = await adminFetch(`/api/admin/albums/${album.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_published: !album.is_published }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(`Update failed: ${json.error ?? res.statusText}`);
        return;
      }
      setAlbums((prev) =>
        prev.map((a) =>
          a.id === album.id ? { ...a, is_published: !a.is_published } : a,
        ),
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function onDelete(album: AlbumWithTrackCount) {
    if (
      !confirm(
        `Delete "${album.title}"? Tracks linked to this album will be deleted too.`,
      )
    )
      return;
    setPendingId(album.id);
    try {
      const res = await adminFetch(`/api/admin/albums/${album.id}`, {
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
        <h2 className="mb-4 text-lg font-medium">New album</h2>
        <AlbumForm
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
        <h2 className="mb-4 text-lg font-medium">Edit album</h2>
        <AlbumForm
          initial={mode.album}
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
        className="mb-4 rounded-full bg-[#3DD6C8] px-4 py-2 font-medium text-[#121212]"
      >
        + Add album
      </button>

      {albums.length === 0 ? (
        <p className="text-white/60">No albums yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#222121]">
            <table className="w-full text-sm">
              <thead className="bg-[#121212]/20 text-left text-xs uppercase tracking-wider text-white/50">
                <tr>
                  <th scope="col" className="px-4 py-3">Cover</th>
                  <th scope="col" className="px-4 py-3">Title</th>
                  <th scope="col" className="px-4 py-3">Release</th>
                  <th scope="col" className="px-4 py-3">Tracks</th>
                  <th scope="col" className="px-4 py-3">Published</th>
                  <th scope="col" className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {albums.map((album) => {
                  const pending = pendingId === album.id;
                  return (
                    <tr key={album.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded"
                          style={{
                            background: album.background_color,
                            color: album.accent_color,
                          }}
                        >
                          {album.cover_image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={album.cover_image}
                              alt={album.title}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-bold">
                              {album.title.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{album.title}</div>
                        <div className="text-xs text-white/50">/{album.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {formatDate(album.release_date)}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {album.track_count}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onTogglePublish(album)}
                          disabled={pending}
                          aria-pressed={album.is_published}
                          aria-label={`${album.is_published ? "Unpublish" : "Publish"} ${album.title}`}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                            album.is_published
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                          } disabled:opacity-50`}
                        >
                          {album.is_published ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/tracks?album=${album.id}`}
                            className="rounded-full border border-[#3DD6C8]/40 px-2.5 py-1 text-xs text-[#3DD6C8] hover:bg-[#3DD6C8]/10"
                          >
                            Tracks
                          </Link>
                          <button
                            onClick={() => setMode({ kind: "edit", album })}
                            className="rounded-full border border-white/15 px-2.5 py-1 text-xs hover:bg-white/5"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(album)}
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

          <div className="mt-6 flex items-center justify-between text-sm text-white/70">
            <span>
              Page {page} of {totalPages} · {totalCount} total
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`?page=${page - 1}`}
                  className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={`?page=${page + 1}`}
                  className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/5"
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
