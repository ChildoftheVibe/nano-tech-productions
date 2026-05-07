"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlbumForm } from "@/components/admin/AlbumForm";
import type { Album } from "@/lib/db-types";

type Props = { initialAlbums: Album[] };

export function AlbumsManager({ initialAlbums }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<
    { kind: "list" } | { kind: "create" } | { kind: "edit"; album: Album }
  >({ kind: "list" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onDelete(album: Album) {
    if (!confirm(`Delete "${album.title}"? Tracks linked to this album will be deleted too.`))
      return;
    setDeletingId(album.id);
    try {
      const res = await fetch(`/api/admin/albums/${album.id}`, {
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
        className="mb-4 rounded bg-[#3DD6C8] px-4 py-2 font-medium text-black"
      >
        + New album
      </button>

      {initialAlbums.length === 0 ? (
        <p className="text-white/60">No albums yet.</p>
      ) : (
        <ul className="space-y-2">
          {initialAlbums.map((album) => (
            <li
              key={album.id}
              className="flex items-center justify-between rounded border border-white/10 bg-black/20 p-4"
            >
              <div>
                <div className="font-medium">{album.title}</div>
                <div className="text-sm text-white/60">
                  /{album.slug} ·{" "}
                  {album.is_published ? "Published" : "Unpublished"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode({ kind: "edit", album })}
                  className="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/5"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(album)}
                  disabled={deletingId === album.id}
                  className="rounded border border-red-500/40 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {deletingId === album.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
