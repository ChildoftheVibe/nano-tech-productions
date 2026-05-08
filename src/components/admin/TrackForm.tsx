"use client";

import { useState } from "react";
import type { Album, Track } from "@/lib/db-types";
import { CloudinaryUploader } from "./CloudinaryUploader";

type Props = {
  initial?: Track;
  albums: Pick<Album, "id" | "title">[];
  onSaved?: (track: Track) => void;
  onCancel?: () => void;
};

type FormState = {
  album_id: string;
  title: string;
  track_number: string;
  duration: string;
  price: string;
  audio_url: string;
  public_audio_id: string;
  vault_audio_id: string;
  wav_file_size_mb: string;
  features: string;
  is_downloadable: boolean;
  is_published: boolean;
};

function emptyForm(): FormState {
  return {
    album_id: "",
    title: "",
    track_number: "",
    duration: "",
    price: "1.00",
    audio_url: "",
    public_audio_id: "",
    vault_audio_id: "",
    wav_file_size_mb: "",
    features: "",
    is_downloadable: true,
    is_published: false,
  };
}

function fromTrack(t: Track): FormState {
  return {
    album_id: t.album_id ?? "",
    title: t.title,
    track_number: t.track_number?.toString() ?? "",
    duration: t.duration ?? "",
    price: t.price.toString(),
    audio_url: t.audio_url ?? "",
    public_audio_id: t.public_audio_id ?? "",
    vault_audio_id: t.vault_audio_id ?? "",
    wav_file_size_mb: t.wav_file_size_mb?.toString() ?? "",
    features: (t.features ?? []).join(", "),
    is_downloadable: t.is_downloadable,
    is_published: t.is_published,
  };
}

export function TrackForm({ initial, albums, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() =>
    initial ? fromTrack(initial) : emptyForm(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        album_id: form.album_id || null,
        title: form.title,
        track_number: form.track_number ? Number(form.track_number) : null,
        duration: form.duration || null,
        price: form.price ? Number(form.price) : 1,
        audio_url: form.audio_url || null,
        public_audio_id: form.public_audio_id || null,
        vault_audio_id: form.vault_audio_id || null,
        wav_file_size_mb: form.wav_file_size_mb
          ? Number(form.wav_file_size_mb)
          : null,
        features: form.features
          ? form.features
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        is_downloadable: form.is_downloadable,
        is_published: form.is_published,
      };
      const url = initial
        ? `/api/admin/tracks/${initial.id}`
        : "/api/admin/tracks";
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      onSaved?.(json.track);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-white">
      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Album</span>
        <select
          value={form.album_id}
          onChange={(e) => set("album_id", e.target.value)}
          className="w-full rounded border border-white/20 bg-[#393838] px-3 py-2 outline-none focus:border-[#3DD6C8]"
        >
          <option value="">— No album (single) —</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Title</span>
        <input
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-white/70">Track #</span>
          <input
            type="number"
            min="1"
            value={form.track_number}
            onChange={(e) => set("track_number", e.target.value)}
            className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-white/70">Duration (e.g. 3:42)</span>
          <input
            value={form.duration}
            onChange={(e) => set("duration", e.target.value)}
            className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">Price (USD)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={(e) => set("price", e.target.value)}
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <CloudinaryUploader
        folder="ntp/audio/public"
        resourceType="video"
        accept="audio/*"
        label="Public audio (streaming MP3/WAV)"
        helpText="Streamed from public CDN as MP3 320kbps."
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

      <CloudinaryUploader
        folder="ntp/audio/vault"
        resourceType="video"
        accept="audio/wav,audio/x-wav,audio/aiff"
        label="Master WAV file"
        helpText="Private vault — admin-only, signed access."
        vault
        currentPublicId={form.vault_audio_id || null}
        onUploaded={(r) => {
          set("vault_audio_id", r.publicId);
          if (r.bytes) set("wav_file_size_mb", (r.bytes / 1_048_576).toFixed(2));
        }}
        onClear={() => {
          set("vault_audio_id", "");
          set("wav_file_size_mb", "");
        }}
      />

      <label className="block">
        <span className="mb-1 block text-sm text-white/70">
          Features (comma-separated)
        </span>
        <input
          value={form.features}
          onChange={(e) => set("features", e.target.value)}
          placeholder="Artist A, Artist B"
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-[#3DD6C8]"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_downloadable}
          onChange={(e) => set("is_downloadable", e.target.checked)}
        />
        <span className="text-sm">Downloadable</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_published}
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
          {submitting ? "Saving…" : initial ? "Save changes" : "Create track"}
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
