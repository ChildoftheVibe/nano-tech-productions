"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Plus, Trash2, X } from "lucide-react";

export type PlaylistEntry = {
  id: string;
  trackId: string;
  position: number | null;
  isActive: boolean;
};

export type TrackOption = {
  id: string;
  title: string;
  albumTitle: string | null;
  isPublished: boolean;
  hasAudio: boolean;
};

type Props = {
  initialEntries: PlaylistEntry[];
  tracks: TrackOption[];
};

export function PlaylistManager({ initialEntries, tracks }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<PlaylistEntry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const tracksById = useMemo(() => {
    const m = new Map<string, TrackOption>();
    for (const t of tracks) m.set(t.id, t);
    return m;
  }, [tracks]);

  const inPlaylist = useMemo(
    () => new Set(entries.map((e) => e.trackId)),
    [entries],
  );

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracks.filter((t) => {
      if (inPlaylist.has(t.id)) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.albumTitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [tracks, inPlaylist, search]);

  async function call(body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/playlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Request failed");
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function addTrack(trackId: string) {
    const ok = await call({ action: "add", track_id: trackId });
    if (ok) router.refresh();
  }

  async function addAllPublished() {
    const ok = await call({ action: "add_all_published" });
    if (ok) router.refresh();
  }

  async function toggleActive(entry: PlaylistEntry) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/playlist/${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: !entry.isActive }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Toggle failed");
        return;
      }
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, isActive: !e.isActive } : e)),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(entry: PlaylistEntry) {
    if (!confirm("Remove this track from the playlist?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/playlist/${entry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Remove failed");
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

    await call({ action: "reorder", order: next.map((x) => x.id) });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={addAllPublished}
          disabled={busy}
          className="rounded bg-[#3DD6C8] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          + Add all published tracks
        </button>
        <span className="self-center text-xs text-white/50">
          {entries.length} in playlist · {entries.filter((e) => e.isActive).length}{" "}
          active
        </span>
      </div>

      {error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
          Current order
        </h2>
        {entries.length === 0 ? (
          <p className="text-white/60">No tracks yet — add some below.</p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((entry, i) => {
              const t = tracksById.get(entry.trackId);
              const isOver = overId === entry.id && draggingId !== entry.id;
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
                  className={`flex items-center gap-3 rounded border bg-[#222121] px-3 py-2 transition-colors ${
                    isOver
                      ? "border-[#3DD6C8] bg-[#3DD6C8]/10"
                      : "border-white/10"
                  } ${draggingId === entry.id ? "opacity-50" : ""}`}
                >
                  <GripVertical
                    size={16}
                    className="cursor-grab text-white/40 active:cursor-grabbing"
                  />
                  <span className="w-8 text-right font-mono text-xs text-white/40">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {t?.title ?? "(missing track)"}
                    </div>
                    <div className="truncate text-xs text-white/50">
                      {t?.albumTitle ?? "—"}
                      {t && !t.isPublished ? " · unpublished" : ""}
                      {t && !t.hasAudio ? " · no audio" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(entry)}
                    disabled={busy}
                    className={`rounded px-2.5 py-1 text-xs ${
                      entry.isActive
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/5 text-white/50"
                    }`}
                  >
                    {entry.isActive ? "Active" : "Skipped"}
                  </button>
                  <button
                    onClick={() => removeEntry(entry)}
                    disabled={busy}
                    className="rounded p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
          Available tracks
        </h2>
        <div className="mb-3 flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks…"
            className="w-full max-w-sm rounded border border-white/15 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-[#3DD6C8]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="rounded p-1 text-white/40 hover:text-white"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {filteredAvailable.length === 0 ? (
          <p className="text-white/50">
            {search ? "No matching tracks." : "All tracks are in the playlist."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {filteredAvailable.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded border border-white/10 bg-[#222121] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.title}</div>
                  <div className="truncate text-xs text-white/50">
                    {t.albumTitle ?? "—"}
                    {!t.isPublished ? " · unpublished" : ""}
                    {!t.hasAudio ? " · no audio" : ""}
                  </div>
                </div>
                <button
                  onClick={() => addTrack(t.id)}
                  disabled={busy}
                  className="flex items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:border-[#3DD6C8] hover:text-[#3DD6C8] disabled:opacity-50"
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
