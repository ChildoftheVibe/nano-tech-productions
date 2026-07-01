"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CheckCircle2, Circle, Image, Video } from "lucide-react";
import { CloudinaryUploader, type UploadResult } from "@/components/admin/CloudinaryUploader";
import { adminFetch } from "@/lib/adminFetch";

export type HeroEntry = {
  id: string;
  url: string;
  publicId: string;
  mediaType: "image" | "video";
  isActive: boolean;
  createdAt: string;
};

type Props = {
  initialEntries: HeroEntry[];
};

export function HeroManager({ initialEntries }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<HeroEntry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<"image" | "video">("image");

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
      const newEntry: HeroEntry = {
        id,
        url: result.url,
        publicId: result.publicId,
        mediaType: uploadType,
        isActive: false,
        createdAt: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev]);
    }
    router.refresh();
  }

  async function toggleActive(entry: HeroEntry) {
    const newActive = !entry.isActive;
    const res = await apiFetch(`/api/admin/hero/${entry.id}`, "PATCH", {
      is_active: newActive,
    });
    if (!res) return;
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        isActive: e.id === entry.id ? newActive : newActive ? false : e.isActive,
      })),
    );
    router.refresh();
  }

  async function deleteEntry(entry: HeroEntry) {
    if (!confirm("Delete this hero media? This cannot be undone.")) return;
    const res = await apiFetch(`/api/admin/hero/${entry.id}`, "DELETE");
    if (!res) return;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    router.refresh();
  }

  const active = entries.find((e) => e.isActive);

  return (
    <div className="space-y-10">
      {error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* ── Current active preview ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
          Current Hero
        </h2>
        {active ? (
          <div className="relative overflow-hidden rounded-xl border border-white/10" style={{ height: 220 }}>
            {active.mediaType === "video" ? (
              <video
                src={active.url}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt="Active hero"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Static brand asset — not an album cover, intentionally no getAlbumCover() */}
              <img
                src="/assets/ntp-logo.svg"
                alt="Nano Tech"
                className="h-20 w-20 object-contain drop-shadow-2xl opacity-80"
              />
            </div>
            <div className="absolute bottom-2 left-3 rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
              Active · {active.mediaType}
            </div>
          </div>
        ) : (
          <div
            className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#090f0e]"
          >
            <div className="text-center">
              <img
                src="/assets/ntp-logo.svg"
                alt="Nano Tech"
                className="mx-auto h-16 w-16 opacity-40 mb-3"
              />
              <p className="text-sm text-white/40">
                No hero media active — showing default NTP logo
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Upload new media ── */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">
          Upload New Media
        </h2>
        <p className="mb-4 text-xs text-white/40">
          After uploading, activate the media using the toggle below.
        </p>

        {/* Type selector */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setUploadType("image")}
            className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
              uploadType === "image"
                ? "border-[#62f3e4] bg-[#62f3e4]/10 text-[#62f3e4]"
                : "border-white/15 text-white/60 hover:border-white/30"
            }`}
          >
            <Image size={14} />
            Image
          </button>
          <button
            type="button"
            onClick={() => setUploadType("video")}
            className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
              uploadType === "video"
                ? "border-[#62f3e4] bg-[#62f3e4]/10 text-[#62f3e4]"
                : "border-white/15 text-white/60 hover:border-white/30"
            }`}
          >
            <Video size={14} />
            Video
          </button>
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
          Uploaded Media ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-white/50">No media uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`flex items-center gap-3 rounded border px-3 py-2.5 transition-colors ${
                  entry.isActive
                    ? "border-[#62f3e4]/40 bg-[#62f3e4]/5"
                    : "border-white/10 bg-[#222121]"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded">
                  {entry.mediaType === "video" ? (
                    <video
                      src={entry.url}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0.5 right-0.5 rounded bg-black/70 p-0.5">
                    {entry.mediaType === "video" ? (
                      <Video size={9} className="text-white/70" />
                    ) : (
                      <Image size={9} className="text-white/70" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-white/60">
                    {entry.publicId || entry.url}
                  </div>
                  <div className="mt-0.5 text-[10px] text-white/40">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    <span className="uppercase">{entry.mediaType}</span>
                  </div>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => toggleActive(entry)}
                  disabled={busy}
                  title={entry.isActive ? "Deactivate" : "Activate as hero"}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
                    entry.isActive
                      ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {entry.isActive ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Circle size={12} />
                  )}
                  {entry.isActive ? "Active" : "Set Active"}
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteEntry(entry)}
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
