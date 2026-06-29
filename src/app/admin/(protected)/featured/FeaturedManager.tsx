"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

export type FeaturedEntry = {
  id: string;
  albumId: string;
  position: number | null;
  isActive: boolean;
};

export type AlbumOption = {
  id: string;
  slug: string;
  title: string;
  releaseYear: string | null;
  coverImage: string | null;
  accentColor: string;
  isPublished: boolean;
};

type Props = {
  initialEntries: FeaturedEntry[];
  albums: AlbumOption[];
};

export function FeaturedManager({ initialEntries, albums }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<FeaturedEntry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const albumsById = useMemo(() => {
    const m = new Map<string, AlbumOption>();
    for (const a of albums) m.set(a.id, a);
    return m;
  }, [albums]);

  const inFeatured = useMemo(
    () => new Set(entries.map((e) => e.albumId)),
    [entries],
  );

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return albums.filter((a) => {
      if (inFeatured.has(a.id)) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.releaseYear ?? "").includes(q)
      );
    });
  }, [albums, inFeatured, search]);

  async function call(
    url: string,
    method: string,
    body: unknown,
  ): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        setError((json.error as string) ?? "Request failed");
        return null;
      }
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function addAlbum(albumId: string) {
    const res = await call("/api/admin/featured", "POST", {
      action: "add",
      album_id: albumId,
    });
    if (!res) return;
    const entryId = typeof res.entryId === "string" ? res.entryId : null;
    if (entryId) {
      setEntries((prev) => {
        if (prev.some((e) => e.id === entryId || e.albumId === albumId)) {
          return prev.map((e) =>
            e.albumId === albumId ? { ...e, isActive: true } : e,
          );
        }
        const nextPos =
          prev.reduce((m, e) => Math.max(m, e.position ?? 0), 0) + 1;
        return [
          ...prev,
          { id: entryId, albumId, position: nextPos, isActive: true },
        ];
      });
    }
    router.refresh();
  }

  async function toggleActive(entry: FeaturedEntry) {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/featured/${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !entry.isActive }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as Record<string, unknown>).error as string ?? "Toggle failed");
        return;
      }
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, isActive: !e.isActive } : e,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(entry: FeaturedEntry) {
    if (!confirm("Remove this album from the Featured section?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/featured/${entry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as Record<string, unknown>).error as string ?? "Remove failed");
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } finally {
      setBusy(false);
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

    const next = [...entries];
    const fromIdx = next.findIndex((x) => x.id === sourceId);
    const toIdx = next.findIndex((x) => x.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setEntries(next);

    await call("/api/admin/featured", "POST", {
      action: "reorder",
      order: next.map((x) => x.id),
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/50">
          {entries.length} featured ·{" "}
          {entries.filter((e) => e.isActive).length} active
        </span>
      </div>

      {error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* ── Current featured list ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
          Featured order
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-white/50">
            No albums featured yet — add some below. The home page will fall
            back to the three most-recent albums until entries are saved.
          </p>
        ) : (
          <ul
            className="space-y-1.5 overflow-y-auto rounded border border-white/5 p-1"
            style={{ maxHeight: "calc(100vh - 380px)" }}
          >
            {entries.map((entry, i) => {
              const album = albumsById.get(entry.albumId);
              const isOver =
                overId === entry.id && draggingId !== entry.id;
              return (
                <li
                  key={entry.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, entry.id)}
                  onDragOver={(e) => onDragOver(e, entry.id)}
                  onDrop={(e) => onDrop(e, entry.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverId(null);
                  }}
                  className={`flex min-h-[52px] items-center gap-3 rounded border bg-[#222121] px-3 py-2 transition-colors ${
                    isOver
                      ? "border-[#3DD6C8] bg-[#3DD6C8]/10"
                      : "border-white/10"
                  } ${draggingId === entry.id ? "opacity-50" : ""}`}
                >
                  <GripVertical
                    size={16}
                    className="cursor-grab text-white/40 active:cursor-grabbing flex-shrink-0"
                  />
                  <span className="w-6 text-right font-mono text-xs text-white/40 flex-shrink-0">
                    {i + 1}
                  </span>
                  {/* Cover thumbnail */}
                  {album?.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.coverImage}
                      alt={album.title}
                      className="h-9 w-9 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div
                      className="h-9 w-9 flex-shrink-0 rounded"
                      style={{
                        background: album?.accentColor ?? "#242b2a",
                      }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {album?.title ?? "(unknown album)"}
                    </div>
                    <div className="truncate text-xs text-white/50">
                      {album?.releaseYear ?? "—"}
                      {album && !album.isPublished ? " · unpublished" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(entry)}
                    disabled={busy}
                    className={`rounded px-2.5 py-1 text-xs flex-shrink-0 ${
                      entry.isActive
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/5 text-white/50"
                    }`}
                  >
                    {entry.isActive ? "Active" : "Hidden"}
                  </button>
                  <button
                    onClick={() => removeEntry(entry)}
                    disabled={busy}
                    className="flex-shrink-0 rounded-full p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Available albums ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
          Available albums
        </h2>
        <div className="mb-3 flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search albums…"
            className="w-full max-w-sm rounded border border-white/15 bg-[#121212]/30 px-3 py-1.5 text-sm outline-none focus:border-[#3DD6C8]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="rounded-full p-1 text-white/40 hover:text-white"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {filteredAvailable.length === 0 ? (
          <p className="text-sm text-white/50">
            {search
              ? "No matching albums."
              : "All albums are already featured."}
          </p>
        ) : (
          <ul
            className="grid grid-cols-1 gap-1.5 overflow-y-auto rounded border border-white/5 p-1 md:grid-cols-2"
            style={{ maxHeight: "calc(100vh - 380px)" }}
          >
            {filteredAvailable.map((album) => (
              <li
                key={album.id}
                className="flex min-h-[52px] items-center gap-3 rounded border border-white/10 bg-[#222121] px-3 py-2"
              >
                {album.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={album.coverImage}
                    alt={album.title}
                    className="h-9 w-9 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div
                    className="h-9 w-9 flex-shrink-0 rounded"
                    style={{ background: album.accentColor }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {album.title}
                  </div>
                  <div className="truncate text-xs text-white/50">
                    {album.releaseYear ?? "—"}
                    {!album.isPublished ? " · unpublished" : ""}
                  </div>
                </div>
                <button
                  onClick={() => addAlbum(album.id)}
                  disabled={busy}
                  className="flex flex-shrink-0 items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:border-[#3DD6C8] hover:text-[#3DD6C8] disabled:opacity-50"
                >
                  <Plus size={12} /> Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
