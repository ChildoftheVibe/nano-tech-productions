"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Album } from "@/lib/db-types";
import { adminFetch } from "@/lib/adminFetch";
import { CloudinaryUploader } from "./CloudinaryUploader";

const MAX_COVER_VIDEOS = 4;

type Props = {
  initial?: Album;
  onSaved?: (album: Album) => void;
  onCancel?: () => void;
};

const TEXT_FIELDS: Array<{
  key: keyof Album;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}> = [
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description" },
  { key: "release_date", label: "Release date", type: "date" },
  { key: "background_color", label: "Background color", type: "color" },
  { key: "accent_color", label: "Accent color", type: "color" },
  { key: "spotify_url", label: "Spotify URL" },
  { key: "apple_music_url", label: "Apple Music URL" },
  { key: "youtube_url", label: "YouTube URL" },
  { key: "amazon_url", label: "Amazon URL" },
  { key: "copyright", label: "Copyright" },
];

const SLUG_RE = /^[a-z0-9_-]+$/;

function emptyForm(): Record<string, string | boolean> {
  return {
    slug: "",
    title: "",
    description: "",
    release_date: "",
    cover_image: "",
    background_color: "#393838",
    accent_color: "#3DD6C8",
    spotify_url: "",
    apple_music_url: "",
    youtube_url: "",
    amazon_url: "",
    copyright: "© Nano Tech Productions. All rights reserved.",
    price: "9.99",
    nb_price: "",
    album_type: 'album',
    light_mode: false,
    is_published: false,
  };
}

function fromAlbum(a: Album): Record<string, string | boolean> {
  return {
    slug: a.slug,
    title: a.title,
    description: a.description ?? "",
    release_date: a.release_date ?? "",
    cover_image: a.cover_image ?? "",
    background_color: a.background_color,
    accent_color: a.accent_color,
    spotify_url: a.spotify_url ?? "",
    apple_music_url: a.apple_music_url ?? "",
    youtube_url: a.youtube_url ?? "",
    amazon_url: a.amazon_url ?? "",
    copyright: a.copyright ?? "",
    price: String(a.price ?? "9.99"),
    nb_price: a.nb_price != null ? String(a.nb_price) : "",
    album_type: a.album_type ?? 'album',
    light_mode: a.light_mode ?? false,
    is_published: a.is_published,
  };
}

export function AlbumForm({ initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState(() =>
    initial ? fromAlbum(initial) : emptyForm(),
  );
  const [coverVideos, setCoverVideos] = useState<string[]>(
    () => initial?.cover_videos ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends string>(key: K, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = initial
        ? `/api/admin/albums/${initial.id}`
        : "/api/admin/albums";
      const method = initial ? "PATCH" : "POST";
      const res = await adminFetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, cover_videos: coverVideos }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      onSaved?.(json.album);
    } finally {
      setSubmitting(false);
    }
  }

  const slug = String(form.slug ?? "");
  const slugReady = SLUG_RE.test(slug);
  const coverFolder = slugReady ? `ntp/${slug}/cover` : "ntp/images/covers";
  const videoFolder = slugReady ? `ntp/${slug}/cover-videos` : "ntp/video/covers";

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-white">
      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Slug</span>
        <input
          type="text"
          required
          placeholder="my-album"
          value={slug}
          onChange={(e) => set("slug", e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <CloudinaryUploader
        folder={coverFolder}
        resourceType="image"
        accept="image/*"
        label="Cover image"
        helpText={`JPG, PNG, or WebP. Uploads to /${coverFolder}.`}
        disabled={!slugReady}
        disabledReason="Enter a slug first (lowercase letters, digits, _ or - only)."
        currentUrl={(form.cover_image as string) || null}
        onUploaded={(r) => set("cover_image", r.url)}
        onClear={() => set("cover_image", "")}
      />

      {/* Cover videos — up to 4 short looping clips played in the cover carousel */}
      <div className="space-y-2">
        <span className="block text-sm text-white/70">
          Cover videos
          <span className="ml-2 text-xs text-white/40">
            up to {MAX_COVER_VIDEOS}, 5–7s loops · the cover image stays slide 1
          </span>
        </span>

        {coverVideos.length > 0 ? (
          <ul className="space-y-1">
            {coverVideos.map((v, i) => (
              <li
                key={`${v}-${i}`}
                className="flex items-center gap-2 rounded border border-white/10 bg-[#121212]/30 px-2 py-1.5"
              >
                <span className="rounded bg-[#3DD6C8]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#3DD6C8]">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-xs text-white/60">{v}</span>
                <button
                  type="button"
                  aria-label={`Remove cover video ${i + 1}`}
                  onClick={() =>
                    setCoverVideos((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="text-white/50 hover:text-white"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {coverVideos.length < MAX_COVER_VIDEOS ? (
          <CloudinaryUploader
            folder={videoFolder}
            resourceType="video"
            accept="video/*"
            label={`Add cover video (${coverVideos.length}/${MAX_COVER_VIDEOS})`}
            helpText={`MP4 or WebM, 5–7s loop. Uploads to /${videoFolder}.`}
            disabled={!slugReady}
            disabledReason="Enter a slug first (lowercase letters, digits, _ or - only)."
            onUploaded={(r) => setCoverVideos((prev) => [...prev, r.url])}
          />
        ) : (
          <p className="text-[11px] text-white/40">
            Maximum of {MAX_COVER_VIDEOS} cover videos reached.
          </p>
        )}
      </div>

      {TEXT_FIELDS.map((f) => (
        <label key={f.key as string} className="block">
          <span className="mb-1 block text-sm text-white/70">{f.label}</span>
          <input
            type={f.type ?? "text"}
            required={f.required}
            placeholder={f.placeholder}
            value={String(form[f.key as string] ?? "")}
            onChange={(e) => set(f.key as string, e.target.value)}
            className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
          />
        </label>
      ))}

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Album price (USD)</span>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/40">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="9.99"
            value={String(form.price ?? "9.99")}
            onChange={(e) => set("price", e.target.value)}
            className="w-full rounded border border-white/20 bg-transparent py-2 pl-7 pr-3 outline-none focus:border-[#3DD6C8]"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">
          Album price (Nano Bucks) — leave blank to disable NB redemption
        </span>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 500"
          value={String(form.nb_price ?? "")}
          onChange={(e) => set("nb_price", e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Release Type</span>
        <select
          name="album_type"
          defaultValue={form.album_type as string ?? 'album'}
          onChange={(e) => set("album_type", e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        >
          <option value="album">Album (full-length)</option>
          <option value="ep">EP (8 tracks or less)</option>
          <option value="single">Single</option>
        </select>
        <span className="mt-1 block text-xs text-white/50">EPs have 8 tracks or fewer.</span>
      </label>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={Boolean(form.light_mode)}
          onChange={(e) => set("light_mode", e.target.checked)}
        />
        <span className="text-sm">
          Light mode
          <span className="mt-0.5 block text-xs text-white/50">
            Renders this album&rsquo;s page with a light theme instead of the default dark theme.
          </span>
        </span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(form.is_published)}
          onChange={(e) => set("is_published", e.target.checked)}
        />
        <span className="text-sm">Published</span>
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#3DD6C8] px-4 py-2 font-medium text-[#121212] disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Create album"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/20 px-4 py-2 text-white/80 hover:bg-white/5"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
