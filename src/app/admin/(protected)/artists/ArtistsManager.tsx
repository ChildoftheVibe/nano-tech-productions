"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Pencil, Plus, Trash2, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArtistForm, type AdminAlbumOption, type AdminTrackOption } from "./ArtistForm";

export type AdminArtistRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  profileImage: string | null;
  location: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  trackCount: number;
  albumCount: number;
};

type Props = {
  initialArtists: AdminArtistRow[];
  allTracks: AdminTrackOption[];
  allAlbums: AdminAlbumOption[];
};

type View =
  | { mode: "list" }
  | { mode: "new" }
  | { mode: "edit"; artistId: string };

function initials(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function ArtistsManager({ initialArtists, allTracks, allAlbums }: Props) {
  const router = useRouter();
  const [artists, setArtists] = useState<AdminArtistRow[]>(initialArtists);
  const [view, setView] = useState<View>({ mode: "list" });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingArtist = useMemo(
    () => (view.mode === "edit" ? artists.find((a) => a.id === view.artistId) ?? null : null),
    [view, artists],
  );

  async function patchArtist(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/artists/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? res.statusText);
    }
  }

  async function onToggle(
    artist: AdminArtistRow,
    field: "isFeatured" | "isPublished",
  ) {
    setPendingId(artist.id);
    setError(null);
    try {
      const dbField = field === "isFeatured" ? "is_featured" : "is_published";
      const next = !artist[field];
      await patchArtist(artist.id, { [dbField]: next });
      setArtists((prev) =>
        prev.map((a) => (a.id === artist.id ? { ...a, [field]: next } : a)),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }

  async function onEditOrder(artist: AdminArtistRow) {
    const input = prompt(`Sort order for "${artist.name}":`, String(artist.sortOrder));
    if (input === null) return;
    const num = Number(input);
    if (!Number.isFinite(num)) return;
    setPendingId(artist.id);
    setError(null);
    try {
      await patchArtist(artist.id, { sort_order: num });
      setArtists((prev) => {
        const next = prev.map((a) =>
          a.id === artist.id ? { ...a, sortOrder: num } : a,
        );
        next.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        return next;
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPendingId(null);
    }
  }

  async function onDelete(artist: AdminArtistRow) {
    if (
      !confirm(
        `Delete "${artist.name}"? This removes their page and all track/album associations.`,
      )
    )
      return;
    setPendingId(artist.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/artists/${artist.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? res.statusText);
      }
      setArtists((prev) => prev.filter((a) => a.id !== artist.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setPendingId(null);
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  }

  async function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = draggingId ?? e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const next = [...artists];
    const from = next.findIndex((a) => a.id === sourceId);
    const to = next.findIndex((a) => a.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // Reassign sort_order in 10s so manual inserts have headroom.
    const renumbered = next.map((a, i) => ({ ...a, sortOrder: (i + 1) * 10 }));
    setArtists(renumbered);

    // Persist new sort_order for everyone whose order changed.
    setError(null);
    try {
      await Promise.all(
        renumbered.map((a) => patchArtist(a.id, { sort_order: a.sortOrder })),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
    }
  }

  function onSaved() {
    setView({ mode: "list" });
    router.refresh();
  }

  if (view.mode === "new") {
    return (
      <div>
        <Header
          title="Add Artist"
          onBack={() => setView({ mode: "list" })}
          backLabel="Back to list"
        />
        <ArtistForm
          allTracks={allTracks}
          allAlbums={allAlbums}
          onSaved={onSaved}
          onCancel={() => setView({ mode: "list" })}
        />
      </div>
    );
  }

  if (view.mode === "edit" && editingArtist) {
    return (
      <div>
        <Header
          title={`Edit: ${editingArtist.name}`}
          onBack={() => setView({ mode: "list" })}
          backLabel="Back to list"
        />
        <ArtistForm
          artistId={editingArtist.id}
          allTracks={allTracks}
          allAlbums={allAlbums}
          onSaved={onSaved}
          onCancel={() => setView({ mode: "list" })}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-[0.15em]">
            Artists
          </h1>
          <p className="mt-1 text-xs text-white/50">
            {artists.length} {artists.length === 1 ? "artist" : "artists"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView({ mode: "new" })}
          className="inline-flex items-center gap-2 rounded bg-[#3DD6C8] px-4 py-2 text-sm font-bold text-black hover:brightness-110"
        >
          <Plus size={16} />
          Add New Artist
        </button>
      </div>

      {error ? (
        <p role="alert" className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {artists.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No artists yet"
          message="Add your first artist to get started."
          actionLabel="Add Artist"
          actionHref="#"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              <tr className="border-b border-white/10">
                <th scope="col" className="px-2 py-2 text-left" />
                <th scope="col" className="px-2 py-2 text-left">Photo</th>
                <th scope="col" className="px-2 py-2 text-left">Name</th>
                <th scope="col" className="px-2 py-2 text-left">Role</th>
                <th scope="col" className="px-2 py-2 text-right">Tracks</th>
                <th scope="col" className="px-2 py-2 text-right">Albums</th>
                <th scope="col" className="px-2 py-2 text-center">Featured</th>
                <th scope="col" className="px-2 py-2 text-center">Published</th>
                <th scope="col" className="px-2 py-2 text-right">Order</th>
                <th scope="col" className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artists.map((artist) => {
                const isPending = pendingId === artist.id;
                const isOver = overId === artist.id && draggingId !== artist.id;
                return (
                  <tr
                    key={artist.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, artist.id)}
                    onDragOver={(e) => onDragOver(e, artist.id)}
                    onDrop={(e) => onDrop(e, artist.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverId(null);
                    }}
                    className={`border-b border-white/5 transition-colors ${
                      isOver ? "bg-[#3DD6C8]/10" : ""
                    } ${draggingId === artist.id ? "opacity-50" : ""}`}
                  >
                    <td className="px-2 py-2">
                      <GripVertical
                        size={14}
                        className="cursor-grab text-white/40 active:cursor-grabbing"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/5 font-mono text-sm font-bold text-[#3DD6C8]">
                        {artist.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={artist.profileImage}
                            alt={`${artist.name} profile photo`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(artist.name)
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 font-medium">
                      <div>{artist.name}</div>
                      <div className="text-[11px] text-white/40">/{artist.slug}</div>
                    </td>
                    <td className="px-2 py-2 text-white/70">
                      {artist.role}
                    </td>
                    <td className="px-2 py-2 text-right text-white/70">
                      {artist.trackCount}
                    </td>
                    <td className="px-2 py-2 text-right text-white/70">
                      {artist.albumCount}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onToggle(artist, "isFeatured")}
                        disabled={isPending}
                        aria-pressed={artist.isFeatured}
                        aria-label={`${artist.isFeatured ? "Unfeature" : "Feature"} ${artist.name}`}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          artist.isFeatured
                            ? "bg-[#EB41DF]/20 text-[#EB41DF]"
                            : "bg-white/5 text-white/40"
                        } disabled:opacity-50`}
                      >
                        {artist.isFeatured ? "Featured" : "Off"}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onToggle(artist, "isPublished")}
                        disabled={isPending}
                        aria-pressed={artist.isPublished}
                        aria-label={`${artist.isPublished ? "Unpublish" : "Publish"} ${artist.name}`}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          artist.isPublished
                            ? "bg-[#3DD6C8]/20 text-[#3DD6C8]"
                            : "bg-white/5 text-white/40"
                        } disabled:opacity-50`}
                      >
                        {artist.isPublished ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onEditOrder(artist)}
                        disabled={isPending}
                        className="font-mono text-xs text-white/70 hover:text-white"
                      >
                        {artist.sortOrder}
                      </button>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setView({ mode: "edit", artistId: artist.id })
                          }
                          className="rounded p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(artist)}
                          disabled={isPending}
                          className="rounded p-1.5 text-white/60 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
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

function Header({
  title,
  onBack,
  backLabel,
}: {
  title: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="font-mono text-2xl font-bold uppercase tracking-[0.15em]">
        {title}
      </h1>
      <button
        type="button"
        onClick={onBack}
        className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-white/30 hover:text-white"
      >
        ← {backLabel}
      </button>
    </div>
  );
}
