"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  CheckCircle2,
  Circle,
  Image,
  Video,
  GripVertical,
} from "lucide-react";
import { CloudinaryUploader, type UploadResult } from "@/components/admin/CloudinaryUploader";
import { adminFetch } from "@/lib/adminFetch";

export type HeroEntry = {
  id: string;
  url: string;
  publicId: string;
  mediaType: "image" | "video";
  isActive: boolean;
  position: number | null;
  createdAt: string;
};

const MAX_ACTIVE = 10;

type Props = {
  initialEntries: HeroEntry[];
};

export function HeroManager({ initialEntries }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<HeroEntry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<"image" | "video">("image");
  const [previewIdx, setPreviewIdx] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const activeEntries = entries
    .filter((e) => e.isActive)
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  async function apiFetch(
    url: string,
    method: string,
    body?: unknown,
  ): Promise<Record<string, unknown> | null> {
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
    const res = await apiFetch("/api/admin/hero", "POST", {
      url: result.url,
      public_id: result.publicId,
      media_type: uploadType,
    });
    if (!res) return;
    const id = typeof res.id === "string" ? res.id : null;
    if (id) {
      setEntries((prev) => [
        { id, url: result.url, publicId: result.publicId, mediaType: uploadType, isActive: false, position: null, createdAt: new Date().toISOString() },
        ...prev,
      ]);
    }
    router.refresh();
  }

  async function toggleActive(entry: HeroEntry) {
    const newActive = !entry.isActive;
    if (newActive && activeEntries.length >= MAX_ACTIVE) {
      setError(`Carousel is full — max ${MAX_ACTIVE} active items`);
      return;
    }
    const res = await apiFetch(`/api/admin/hero/${entry.id}`, "PATCH", { is_active: newActive });
    if (!res) return;

    if (newActive) {
      const nextPos = activeEntries.reduce((m, e) => Math.max(m, e.position ?? 0), 0) + 1;
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, isActive: true, position: nextPos } : e)),
      );
      setPreviewIdx(activeEntries.length); // jump to new slide
    } else {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, isActive: false, position: null } : e)),
      );
      setPreviewIdx(0);
    }
    router.refresh();
  }

  async function deleteEntry(entry: HeroEntry) {
    if (!confirm("Delete this hero media? This cannot be undone.")) return;
    const res = await apiFetch(`/api/admin/hero/${entry.id}`, "DELETE");
    if (!res) return;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    if (entry.isActive) setPreviewIdx(0);
    router.refresh();
  }

  // ── Drag-to-reorder for carousel order ───────────────────────────────────
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

    const next = [...activeEntries];
    const fromIdx = next.findIndex((x) => x.id === sourceId);
    const toIdx = next.findIndex((x) => x.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);

    // Optimistic update
    setEntries((prev) => {
      const posMap = new Map(next.map((e, i) => [e.id, i + 1]));
      return prev.map((e) =>
        posMap.has(e.id) ? { ...e, position: posMap.get(e.id)! } : e,
      );
    });
    setPreviewIdx(toIdx);

    await apiFetch("/api/admin/hero", "POST", {
      action: "reorder",
      order: next.map((x) => x.id),
    });
    router.refresh();
  }

  const previewEntry = activeEntries[previewIdx] ?? null;

  return (
    <div className="space-y-10">
      {error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* ── Carousel preview ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
            Carousel Preview
          </h2>
          <span className={`font-mono text-xs ${activeEntries.length >= MAX_ACTIVE ? "text-amber-300" : "text-white/40"}`}>
            {activeEntries.length} / {MAX_ACTIVE} slides
          </span>
        </div>

        {previewEntry ? (
          <div className="relative overflow-hidden rounded-xl border border-white/10" style={{ height: 220 }}>
            {previewEntry.mediaType === "video" ? (
              <video
                key={previewEntry.id}
                src={previewEntry.url}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay muted loop playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={previewEntry.id}
                src={previewEntry.url}
                alt="Hero preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute bottom-2 left-3 rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
              Slide {previewIdx + 1} of {activeEntries.length} · {previewEntry.mediaType}
            </div>
            {/* Mini dot nav */}
            {activeEntries.length > 1 && (
              <div className="absolute bottom-2 right-3 flex gap-1">
                {activeEntries.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPreviewIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === previewIdx ? "w-4 bg-[#62f3e4]" : "w-1.5 bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#090f0e]">
            <div className="text-center">
              {/* Static brand asset — not an album cover, intentionally no getAlbumCover() */}
              <img src="/assets/ntp-logo.svg" alt="Nano Tech" className="mx-auto h-16 w-16 opacity-40 mb-3" />
              <p className="text-sm text-white/40">No slides active — showing default NTP logo</p>
            </div>
          </div>
        )}
      </section>

      {/* ── Carousel order (drag to reorder) ── */}
      {activeEntries.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">
            Carousel Order
          </h2>
          <p className="mb-3 text-xs text-white/40">Drag to reorder. Slides auto-advance every 6 seconds.</p>
          <ul className="space-y-1.5 rounded border border-white/5 p-1">
            {activeEntries.map((entry, i) => {
              const isOver = overId === entry.id && draggingId !== entry.id;
              return (
                <li
                  key={entry.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, entry.id)}
                  onDragOver={(e) => onDragOver(e, entry.id)}
                  onDrop={(e) => onDrop(e, entry.id)}
                  onDragEnd={() => { setDraggingId(null); setOverId(null); }}
                  onClick={() => setPreviewIdx(i)}
                  className={`flex items-center gap-3 rounded border px-3 py-2 cursor-pointer transition-colors ${
                    isOver ? "border-[#62f3e4] bg-[#62f3e4]/10" :
                    i === previewIdx ? "border-[#62f3e4]/40 bg-[#62f3e4]/5" :
                    "border-white/10 bg-[#222121]"
                  } ${draggingId === entry.id ? "opacity-50" : ""}`}
                >
                  <GripVertical size={15} className="cursor-grab text-white/40 active:cursor-grabbing flex-shrink-0" />
                  <span className="w-5 text-right font-mono text-xs text-white/40 flex-shrink-0">{i + 1}</span>
                  <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded">
                    {entry.mediaType === "video" ? (
                      <video src={entry.url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-white/60">{entry.publicId || entry.url}</div>
                    <div className="text-[10px] uppercase text-white/40">{entry.mediaType}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); void toggleActive(entry); }}
                    disabled={busy}
                    title="Remove from carousel"
                    className="flex-shrink-0 rounded px-2 py-1 text-xs bg-white/5 text-white/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Upload new media ── */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">
          Upload New Media
        </h2>
        <p className="mb-4 text-xs text-white/40">
          After uploading, activate the media from the library below.
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

        {/* Minimum size requirements */}
        <div className="mb-4 rounded border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/80 space-y-1">
          <p className="font-semibold uppercase tracking-wider text-amber-300">
            Minimum upload requirements
          </p>
          {uploadType === "image" ? (
            <>
              <p>· Minimum dimensions: <strong>1920 × 600 px</strong></p>
              <p>· Recommended: 1920 × 800 px or wider (16:9 or wider aspect ratio)</p>
              <p>· Formats: JPG, PNG, WebP · Max file size: 20 MB</p>
            </>
          ) : (
            <>
              <p>· Minimum dimensions: <strong>1280 × 480 px</strong></p>
              <p>· Recommended: 1920 × 1080 px (16:9)</p>
              <p>· Formats: MP4, WebM · Max file size: 100 MB · Keep under 30 seconds</p>
              <p>· Video will be muted and looped automatically</p>
            </>
          )}
        </div>

        <CloudinaryUploader
          folder="ntp/hero"
          resourceType={uploadType}
          accept={uploadType === "image" ? "image/*" : "video/mp4,video/webm"}
          label={uploadType === "image" ? "Hero Image" : "Hero Video"}
          helpText={
            uploadType === "image"
              ? "Upload a landscape image (min 1920×600px)"
              : "Upload a short looping video (min 1280×480px, MP4 recommended)"
          }
          onUploaded={handleUploaded}
        />
      </section>

      {/* ── Media library ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
            Media Library ({entries.length})
          </h2>
          {activeEntries.length >= MAX_ACTIVE && (
            <span className="text-xs text-amber-300">Carousel full — deactivate a slide to add another</span>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-white/50">No media uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`flex items-center gap-3 rounded border px-3 py-2.5 transition-colors ${
                  entry.isActive ? "border-[#62f3e4]/40 bg-[#62f3e4]/5" : "border-white/10 bg-[#222121]"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded">
                  {entry.mediaType === "video" ? (
                    <video src={entry.url} className="h-full w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.url} alt="" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute bottom-0.5 right-0.5 rounded bg-black/70 p-0.5">
                    {entry.mediaType === "video" ? <Video size={9} className="text-white/70" /> : <Image size={9} className="text-white/70" />}
                  </div>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-white/60">{entry.publicId || entry.url}</div>
                  <div className="mt-0.5 text-[10px] text-white/40">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    {" · "}<span className="uppercase">{entry.mediaType}</span>
                    {entry.isActive && entry.position != null && (
                      <span className="ml-1.5 text-[#62f3e4]/70">slide {entry.position}</span>
                    )}
                  </div>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => void toggleActive(entry)}
                  disabled={busy || (!entry.isActive && activeEntries.length >= MAX_ACTIVE)}
                  title={
                    !entry.isActive && activeEntries.length >= MAX_ACTIVE
                      ? `Carousel full (max ${MAX_ACTIVE})`
                      : entry.isActive ? "Remove from carousel" : "Add to carousel"
                  }
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    entry.isActive
                      ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {entry.isActive ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                  {entry.isActive ? "In Carousel" : "Add to Carousel"}
                </button>

                {/* Delete */}
                <button
                  onClick={() => void deleteEntry(entry)}
                  disabled={busy}
                  className="flex-shrink-0 rounded-full p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
