"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  CheckCircle2,
  Circle,
  Smartphone,
  Monitor,
  Disc3,
  RotateCcw,
} from "lucide-react";
import { CloudinaryUploader, type UploadResult } from "@/components/admin/CloudinaryUploader";
import { adminFetch } from "@/lib/adminFetch";

export type ReplayMode = "session" | "always";

export type IntroEntry = {
  id: string;
  portraitUrl: string | null;
  portraitPublicId: string | null;
  landscapeUrl: string | null;
  landscapePublicId: string | null;
  albumId: string | null;
  replayMode: ReplayMode;
  isActive: boolean;
  createdAt: string;
};

export type AlbumOption = { id: string; title: string; slug: string };

type Props = {
  initialEntries: IntroEntry[];
  albums: AlbumOption[];
};

const REPLAY_LABEL: Record<ReplayMode, string> = {
  session: "Once per session",
  always: "Every visit",
};

export function IntroVideoManager({ initialEntries, albums }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<IntroEntry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft state for creating a new intro pop-up.
  const [portrait, setPortrait] = useState<UploadResult | null>(null);
  const [landscape, setLandscape] = useState<UploadResult | null>(null);
  const [draftAlbumId, setDraftAlbumId] = useState<string>("");
  const [draftReplay, setDraftReplay] = useState<ReplayMode>("session");

  const albumTitle = (id: string | null) =>
    id ? albums.find((a) => a.id === id)?.title ?? "Unknown album" : "None";

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

  async function createIntro() {
    if (!portrait && !landscape) {
      setError("Upload a portrait or landscape video first.");
      return;
    }
    const res = await apiFetch("/api/admin/intro", "POST", {
      portrait_url: portrait?.url ?? null,
      portrait_public_id: portrait?.publicId ?? null,
      landscape_url: landscape?.url ?? null,
      landscape_public_id: landscape?.publicId ?? null,
      album_id: draftAlbumId || null,
      replay_mode: draftReplay,
    });
    if (!res) return;
    const id = typeof res.id === "string" ? res.id : null;
    if (id) {
      setEntries((prev) => [
        {
          id,
          portraitUrl: portrait?.url ?? null,
          portraitPublicId: portrait?.publicId ?? null,
          landscapeUrl: landscape?.url ?? null,
          landscapePublicId: landscape?.publicId ?? null,
          albumId: draftAlbumId || null,
          replayMode: draftReplay,
          isActive: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setPortrait(null);
    setLandscape(null);
    setDraftAlbumId("");
    setDraftReplay("session");
    router.refresh();
  }

  async function toggleActive(entry: IntroEntry) {
    const newActive = !entry.isActive;
    const res = await apiFetch(`/api/admin/intro/${entry.id}`, "PATCH", {
      is_active: newActive,
    });
    if (!res) return;
    // Only one intro can be active — reflect that locally.
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? { ...e, isActive: newActive }
          : newActive
            ? { ...e, isActive: false }
            : e,
      ),
    );
    router.refresh();
  }

  async function updateField(entry: IntroEntry, patch: Partial<Pick<IntroEntry, "albumId" | "replayMode">>) {
    const body: Record<string, unknown> = {};
    if ("albumId" in patch) body.album_id = patch.albumId || null;
    if ("replayMode" in patch) body.replay_mode = patch.replayMode;
    const res = await apiFetch(`/api/admin/intro/${entry.id}`, "PATCH", body);
    if (!res) return;
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, ...patch } : e)));
    router.refresh();
  }

  async function deleteEntry(entry: IntroEntry) {
    if (!confirm("Delete this intro video? This cannot be undone.")) return;
    const res = await apiFetch(`/api/admin/intro/${entry.id}`, "DELETE");
    if (!res) return;
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* ── Create a new intro pop-up ── */}
      <section className="rounded-xl border border-white/10 bg-[#1a1919] p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">
          New Intro Pop-up
        </h2>
        <p className="mb-5 text-xs text-white/40">
          Upload at least one video. Portrait plays on phones; landscape plays on
          desktop over the selected album&apos;s color gradient. If only one is
          provided, it is used on all devices.
        </p>

        <div className="mb-5 grid gap-5 md:grid-cols-2">
          {/* Portrait (9:16) */}
          <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
              <Smartphone size={15} className="text-[#62f3e4]" />
              <span className="font-medium">Portrait · 9:16 · Mobile</span>
            </div>
            <CloudinaryUploader
              folder="ntp/intro"
              resourceType="video"
              accept="video/mp4,video/webm"
              label="Portrait Video"
              helpText="Vertical 1080×1920 recommended · MP4 · keep under 30s"
              currentUrl={portrait?.url ?? null}
              onUploaded={setPortrait}
              onClear={() => setPortrait(null)}
            />
          </div>

          {/* Landscape (16:9) */}
          <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
              <Monitor size={15} className="text-[#62f3e4]" />
              <span className="font-medium">Landscape · 16:9 · Desktop</span>
            </div>
            <CloudinaryUploader
              folder="ntp/intro"
              resourceType="video"
              accept="video/mp4,video/webm"
              label="Landscape Video"
              helpText="Horizontal 1920×1080 recommended · MP4 · keep under 30s"
              currentUrl={landscape?.url ?? null}
              onUploaded={setLandscape}
              onClear={() => setLandscape(null)}
            />
          </div>
        </div>

        <div className="mb-5 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/50">
              <Disc3 size={13} /> Reveal album
            </span>
            <select
              value={draftAlbumId}
              onChange={(e) => setDraftAlbumId(e.target.value)}
              className="w-full rounded border border-white/15 bg-[#090f0e] px-3 py-2 text-sm text-white/80"
            >
              <option value="">No album (just close)</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/50">
              <RotateCcw size={13} /> Replay
            </span>
            <select
              value={draftReplay}
              onChange={(e) => setDraftReplay(e.target.value as ReplayMode)}
              className="w-full rounded border border-white/15 bg-[#090f0e] px-3 py-2 text-sm text-white/80"
            >
              <option value="session">Once per browser session</option>
              <option value="always">Every visit (full page load)</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void createIntro()}
          disabled={busy || (!portrait && !landscape)}
          className="rounded bg-[#62f3e4] px-4 py-2 text-sm font-semibold text-[#003733] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save Intro Pop-up
        </button>
      </section>

      {/* ── Library ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
          Intro Videos ({entries.length})
        </h2>

        {entries.length === 0 ? (
          <p className="text-sm text-white/50">No intro videos yet.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`rounded-xl border p-4 transition-colors ${
                  entry.isActive
                    ? "border-[#62f3e4]/40 bg-[#62f3e4]/5"
                    : "border-white/10 bg-[#222121]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnails */}
                  <div className="flex flex-shrink-0 gap-2">
                    {entry.portraitUrl ? (
                      <video
                        src={entry.portraitUrl}
                        className="h-24 w-[54px] rounded object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="flex h-24 w-[54px] items-center justify-center rounded border border-dashed border-white/15 text-[9px] text-white/30">
                        No 9:16
                      </div>
                    )}
                    {entry.landscapeUrl ? (
                      <video
                        src={entry.landscapeUrl}
                        className="h-24 w-[130px] rounded object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="flex h-24 w-[130px] items-center justify-center rounded border border-dashed border-white/15 text-[9px] text-white/30">
                        No 16:9
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                      {entry.isActive && (
                        <span className="rounded-full bg-[#62f3e4]/20 px-2 py-0.5 font-mono uppercase tracking-wider text-[#62f3e4]">
                          Live
                        </span>
                      )}
                      <span className="uppercase">{REPLAY_LABEL[entry.replayMode]}</span>
                      <span>·</span>
                      <span>Album: {albumTitle(entry.albumId)}</span>
                      <span>·</span>
                      <span>
                        {new Date(entry.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={entry.albumId ?? ""}
                        onChange={(e) =>
                          void updateField(entry, { albumId: e.target.value || null })
                        }
                        disabled={busy}
                        className="w-full rounded border border-white/15 bg-[#090f0e] px-2.5 py-1.5 text-xs text-white/80"
                      >
                        <option value="">No album (just close)</option>
                        {albums.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>

                      <select
                        value={entry.replayMode}
                        onChange={(e) =>
                          void updateField(entry, { replayMode: e.target.value as ReplayMode })
                        }
                        disabled={busy}
                        className="w-full rounded border border-white/15 bg-[#090f0e] px-2.5 py-1.5 text-xs text-white/80"
                      >
                        <option value="session">Once per browser session</option>
                        <option value="always">Every visit (full page load)</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <button
                      onClick={() => void toggleActive(entry)}
                      disabled={busy}
                      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors disabled:opacity-40 ${
                        entry.isActive
                          ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                          : "bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      {entry.isActive ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                      {entry.isActive ? "Active" : "Set Active"}
                    </button>
                    <button
                      onClick={() => void deleteEntry(entry)}
                      disabled={busy}
                      className="rounded-full p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
