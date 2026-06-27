"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import type { Album, Instrumental } from "@/lib/db-types";
import { CloudinaryUploader } from "./CloudinaryUploader";

type Props = {
  initial?: Instrumental;
  albums: Pick<Album, "id" | "title" | "slug">[];
  onSaved?: (row: Instrumental) => void;
  onCancel?: () => void;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type FormState = {
  album_id: string;
  title: string;
  slug: string;
  description: string;
  type: "single" | "album_track";
  price: string;
  duration: string;
  cover_image: string;
  public_audio_id: string;
  vault_audio_id: string;
  audio_url: string;
  is_published: boolean;
  is_downloadable: boolean;
};

function emptyForm(): FormState {
  return {
    album_id: "",
    title: "",
    slug: "",
    description: "",
    type: "single",
    price: "0.99",
    duration: "",
    cover_image: "",
    public_audio_id: "",
    vault_audio_id: "",
    audio_url: "",
    is_published: false,
    is_downloadable: true,
  };
}

function fromRow(r: Instrumental): FormState {
  return {
    album_id: r.album_id ?? "",
    title: r.title,
    slug: r.slug,
    description: r.description ?? "",
    type: r.type,
    price: Number(r.price ?? 0.99).toString(),
    duration: r.duration ?? "",
    cover_image: r.cover_image ?? "",
    public_audio_id: r.public_audio_id ?? "",
    vault_audio_id: r.vault_audio_id ?? "",
    audio_url: r.audio_url ?? "",
    is_published: r.is_published,
    is_downloadable: r.is_downloadable,
  };
}

export function InstrumentalForm({
  initial,
  albums,
  onSaved,
  onCancel,
}: Props) {
  const [form, setForm] = useState<FormState>(
    initial ? fromRow(initial) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Auto-derive slug from title until the user manually edits it.
  const slugReady = useMemo(() => form.slug.length > 0, [form.slug]);
  const onTitleChange = (next: string) => {
    setForm((f) => {
      const autoSlug = !slugReady || f.slug === slugify(f.title);
      return {
        ...f,
        title: next,
        slug: autoSlug ? slugify(next) : f.slug,
      };
    });
  };

  const coverFolder = form.slug
    ? `ntp/instrumentals/${form.slug}/cover`
    : "";
  const audioPublicFolder = form.slug
    ? `ntp/audio/instrumentals/public/${form.slug}`
    : "";
  const audioVaultFolder = form.slug
    ? `ntp/audio/instrumentals/vault/${form.slug}`
    : "";
  const slugReadyForUploads = form.slug.length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.slug.trim()) {
      setError("Slug is required.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        type: form.type,
        album_id: form.type === "album_track" ? form.album_id || null : null,
        price: Number(form.price) || 0,
        duration: form.duration.trim() || null,
        cover_image: form.cover_image || null,
        public_audio_id: form.public_audio_id || null,
        vault_audio_id: form.vault_audio_id || null,
        audio_url: form.audio_url || null,
        is_published: form.is_published,
        is_downloadable: form.is_downloadable,
      };

      const url = initial
        ? `/api/admin/instrumentals/${initial.id}`
        : "/api/admin/instrumentals";
      const method = initial ? "PATCH" : "POST";
      const res = await adminFetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { instrumental: Instrumental }
        | { error: string };
      if (!res.ok || "error" in json) {
        setError(("error" in json && json.error) || res.statusText);
        return;
      }
      onSaved?.(json.instrumental);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {initial ? `Edit: ${initial.title}` : "Add Instrumental"}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#3DD6C8] px-3 py-1.5 text-sm font-bold text-[#121212] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      <section className="space-y-3 rounded border border-white/10 p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">
          Basic Info
        </h3>

        <label className="block">
          <span className="mb-1 block text-xs text-white/70">Title *</span>
          <input
            value={form.title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            className="w-full rounded border border-white/15 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-white/70">Slug *</span>
          <input
            value={form.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
            required
            className="w-full rounded border border-white/15 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-[#3DD6C8]"
          />
          <span className="mt-1 block text-[11px] text-white/40">
            Auto-derived from title. Used in upload paths and URLs.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-white/70">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className="w-full rounded border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#3DD6C8]"
          />
        </label>

        <fieldset>
          <legend className="mb-1 text-xs text-white/70">Type *</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                checked={form.type === "single"}
                onChange={() => set("type", "single")}
              />
              Single
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                checked={form.type === "album_track"}
                onChange={() => set("type", "album_track")}
              />
              Album Track
            </label>
          </div>
        </fieldset>

        {form.type === "album_track" ? (
          <label className="block">
            <span className="mb-1 block text-xs text-white/70">Album</span>
            <select
              value={form.album_id}
              onChange={(e) => set("album_id", e.target.value)}
              className="w-full rounded border border-white/15 bg-[#121212]/40 px-3 py-2 text-sm"
            >
              <option value="">— Select album —</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/70">Price (USD)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              className="w-full rounded border border-white/15 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-[#3DD6C8]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/70">
              Duration (e.g. 3:45)
            </span>
            <input
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              placeholder="3:45"
              className="w-full rounded border border-white/15 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-[#3DD6C8]"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => set("is_published", e.target.checked)}
            />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_downloadable}
              onChange={(e) => set("is_downloadable", e.target.checked)}
            />
            Downloadable
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded border border-white/10 p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">
          Cover
        </h3>
        <CloudinaryUploader
          folder={coverFolder}
          stripPrefix={`ntp/instrumentals/${form.slug}/cover`}
          resourceType="image"
          accept="image/*"
          label="Cover image"
          helpText={`Uploads to /${coverFolder || "ntp/instrumentals/<slug>/cover"}.`}
          disabled={!slugReadyForUploads}
          disabledReason="Set a slug first to enable upload."
          currentUrl={form.cover_image || null}
          onUploaded={(r) => set("cover_image", r.url)}
          onClear={() => set("cover_image", "")}
        />
      </section>

      <section className="space-y-3 rounded border border-white/10 p-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white/60">
          Streaming Audio (MP3 or WAV)
        </h3>
        <CloudinaryUploader
          folder={audioPublicFolder}
          stripPrefix={`ntp/audio/instrumentals/public/${form.slug}`}
          resourceType="video"
          accept="audio/*"
          label="Public audio"
          helpText="Cloudinary auto-generates the 30s preview from this file."
          disabled={!slugReadyForUploads}
          disabledReason="Set a slug first to enable upload."
          currentPublicId={form.public_audio_id || null}
          onUploaded={(r) => {
            set("public_audio_id", r.publicId);
            set("audio_url", r.url);
          }}
          onClear={() => {
            set("public_audio_id", "");
            set("audio_url", "");
          }}
        />
      </section>

      <section className="space-y-3 rounded border border-[#EB41DF]/30 bg-[#EB41DF]/5 p-4">
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-[#EB41DF]" aria-hidden="true" />
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#EB41DF]">
            Master WAV (Vault — Admin Only)
          </h3>
          <span
            className="ml-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#EB41DF]"
            style={{ background: "rgba(235,65,223,0.2)" }}
          >
            VAULT
          </span>
        </div>
        <CloudinaryUploader
          folder={audioVaultFolder}
          stripPrefix={`ntp/audio/instrumentals/vault/${form.slug}`}
          resourceType="video"
          accept="audio/wav,audio/x-wav,audio/aiff"
          label="Master WAV file"
          helpText="Private vault — signed admin access only. Never exposed to public queries."
          vault
          disabled={!slugReadyForUploads}
          disabledReason="Set a slug first to enable upload."
          currentPublicId={form.vault_audio_id || null}
          onUploaded={(r) => set("vault_audio_id", r.publicId)}
          onClear={() => set("vault_audio_id", "")}
        />
      </section>
    </form>
  );
}
