"use client";

import { useState } from "react";
import { Trash2, Image, Video, GripVertical, ArrowLeft, Sparkles } from "lucide-react";
import { CloudinaryUploader, type UploadResult } from "@/components/admin/CloudinaryUploader";
import { adminFetch } from "@/lib/adminFetch";

export type AlbumMediaEntry = {
  id: string;
  url: string;
  publicId: string;
  mediaType: "image" | "video";
  position: number | null;
  caption: string | null;
  createdAt: string;
};

type Props = {
  albumId: string;
  albumTitle: string;
  initialEntries: AlbumMediaEntry[];
  /** album_media id currently chosen as the portal intro video, if any. */
  initialPortalVideoId?: string | null;
  onBack: () => void;
};

export function AlbumMediaManager({
  albumId,
  albumTitle,
  initialEntries,
  initialPortalVideoId = null,
  onBack,
}: Props) {
  const [entries, setEntries] = useState<AlbumMediaEntry[]>(initialEntries);
  const [portalVideoId, setPortalVideoId] = useState<string | null>(initialPortalVideoId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<"image" | "video">("image");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  async function apiFetch(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(url, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError((json.error as string) ?? "Request failed");
        return null;
      }
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function handleUploaded(result: UploadResult) {
    const res = await apiFetch("/api/admin/album-media", "POST", {
      album_id: albumId,
      url: result.url,
      public_id: result.publicId,
      media_type: uploadType,
    });
    if (!res) return;
    const id = typeof res.id === "string" ? res.id : null;
    if (id) {
      const nextPos = sorted.reduce((m, e) => Math.max(m, e.position ?? 0), 0) + 1;
      setEntries((prev) => [
        ...prev,
        { id, url: result.url, publicId: result.publicId, mediaType: uploadType, position: nextPos, caption: null, createdAt: new Date().toISOString() },
      ]);
    }
  }

  async function deleteEntry(entry: AlbumMediaEntry) {
    if (!confirm(`Delete this ${entry.mediaType}? This cannot be undone.`)) return;
    const res = await apiFetch(`/api/admin/album-media/${entry.id}`, "DELETE");
    if (!res) return;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    if (portalVideoId === entry.id) setPortalVideoId(null);
  }

  async function setPortalVideo(entry: AlbumMediaEntry | null) {
    const mediaId = entry?.id ?? null;
    const res = await apiFetch("/api/admin/album-media", "POST", {
      action: "set_portal_video",
      album_id: albumId,
      media_id: mediaId,
    });
    if (!res) return;
    setPortalVideoId(mediaId);
  }

  // ── Drag-to-reorder ───────────────────────────────────────────────────────
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

    const next = [...sorted];
    const fromIdx = next.findIndex((x) => x.id === sourceId);
    const toIdx = next.findIndex((x) => x.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);

    setEntries((prev) => {
      const posMap = new Map(next.map((e, i) => [e.id, i + 1]));
      return prev.map((e) => posMap.has(e.id) ? { ...e, position: posMap.get(e.id)! } : e);
    });

    await apiFetch("/api/admin/album-media", "POST", {
      action: "reorder",
      album_id: albumId,
      order: next.map((x) => x.id),
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:border-white/30 hover:text-white/80 transition-colors"
        >
          <ArrowLeft size={13} />
          Back
        </button>
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40 font-mono">Album Media</p>
          <h2 className="text-base font-semibold text-white">{albumTitle}</h2>
        </div>
      </div>

      {error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Gallery order */}
      {sorted.length > 0 && (
        <section>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">
            Gallery Order ({sorted.length} items)
          </h3>
          <p className="mb-3 text-xs text-white/40">Drag to reorder the gallery display order.</p>
          <ul className="space-y-1.5 rounded border border-white/5 p-1">
            {sorted.map((entry, i) => {
              const isOver = overId === entry.id && draggingId !== entry.id;
              return (
                <li
                  key={entry.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, entry.id)}
                  onDragOver={(e) => onDragOver(e, entry.id)}
                  onDrop={(e) => onDrop(e, entry.id)}
                  onDragEnd={() => { setDraggingId(null); setOverId(null); }}
                  className={`flex items-center gap-3 rounded border px-3 py-2 cursor-grab transition-colors active:cursor-grabbing ${
                    isOver
                      ? "border-[#62f3e4] bg-[#62f3e4]/10"
                      : "border-white/10 bg-[#222121]"
                  } ${draggingId === entry.id ? "opacity-50" : ""}`}
                >
                  <GripVertical size={15} className="text-white/40 flex-shrink-0" />
                  <span className="w-5 text-right font-mono text-xs text-white/40 flex-shrink-0">{i + 1}</span>
                  <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded">
                    {entry.mediaType === "video" ? (
                      <video src={entry.url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <div className="absolute bottom-0.5 right-0.5 rounded bg-black/70 p-0.5">
                      {entry.mediaType === "video"
                        ? <Video size={8} className="text-white/70" />
                        : <Image size={8} className="text-white/70" />}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-white/50">{entry.publicId || entry.url}</div>
                    <div className="text-[10px] uppercase text-white/30">
                      {entry.mediaType}
                      {portalVideoId === entry.id ? (
                        <span className="ml-2 rounded-full bg-[#62f3e4]/15 px-2 py-0.5 font-bold tracking-wider text-[#62f3e4]">
                          Portal Intro
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {entry.mediaType === "video" ? (
                    <button
                      onClick={() =>
                        void setPortalVideo(portalVideoId === entry.id ? null : entry)
                      }
                      disabled={busy}
                      className={`flex-shrink-0 rounded-full p-1.5 disabled:opacity-50 ${
                        portalVideoId === entry.id
                          ? "bg-[#62f3e4]/15 text-[#62f3e4]"
                          : "text-white/40 hover:bg-[#62f3e4]/10 hover:text-[#62f3e4]"
                      }`}
                      title={
                        portalVideoId === entry.id
                          ? "Remove as portal intro video"
                          : "Use as portal intro video (vertical 9:16 recommended)"
                      }
                    >
                      <Sparkles size={14} />
                    </button>
                  ) : null}
                  <button
                    onClick={() => void deleteEntry(entry)}
                    disabled={busy}
                    className="flex-shrink-0 rounded-full p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Upload */}
      <section>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">
          Upload Media
        </h3>
        <p className="mb-4 text-xs text-white/40">
          Images and videos appear in the album gallery modal for visitors. Tap
          the sparkle icon on a video to play it as the portal intro pop-up
          when a visitor enters this album&apos;s portal (vertical 9:16 works best).
        </p>

        <div className="mb-4 flex gap-2">
          {(["image", "video"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setUploadType(t)}
              className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
                uploadType === t
                  ? "border-[#62f3e4] bg-[#62f3e4]/10 text-[#62f3e4]"
                  : "border-white/15 text-white/60 hover:border-white/30"
              }`}
            >
              {t === "image" ? <Image size={14} /> : <Video size={14} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <CloudinaryUploader
          folder={`ntp/albums/${albumId}/media`}
          resourceType={uploadType}
          accept={uploadType === "image" ? "image/*" : "video/mp4,video/webm"}
          label={uploadType === "image" ? "Gallery Image" : "Gallery Video"}
          helpText={
            uploadType === "image"
              ? "Upload a photo or artwork for the album gallery"
              : "Upload a behind-the-scenes or promo video (MP4 recommended)"
          }
          onUploaded={handleUploaded}
        />
      </section>
    </div>
  );
}
