"use client";

import { useState } from "react";
import type { Album } from "@/lib/db-types";
import { CloudinaryUploader } from "./CloudinaryUploader";

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
  { key: "slug", label: "Slug", required: true, placeholder: "my-album" },
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
    is_published: a.is_published,
  };
}

export function AlbumForm({ initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState(() =>
    initial ? fromAlbum(initial) : emptyForm(),
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
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
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

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-white">
      <CloudinaryUploader
        folder="ntp/images/covers"
        resourceType="image"
        accept="image/*"
        label="Cover image"
        helpText="JPG, PNG, or WebP. Stored on Cloudinary CDN."
        currentUrl={(form.cover_image as string) || null}
        onUploaded={(r) => set("cover_image", r.url)}
        onClear={() => set("cover_image", "")}
      />

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
          className="rounded bg-[#3DD6C8] px-4 py-2 font-medium text-black disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Create album"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-white/20 px-4 py-2 text-white/80 hover:bg-white/5"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
