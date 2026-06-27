"use client";

import { useState } from "react";
import { Download, Plus, X } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";
import type { Album, Track } from "@/lib/db-types";
import type { TrackCredits } from "@/types/music";
import { CloudinaryUploader } from "./CloudinaryUploader";

type Props = {
  initial?: Track;
  albums: Pick<Album, "id" | "title" | "slug">[];
  onSaved?: (track: Track) => void;
  onCancel?: () => void;
};

type CreditRoleKey =
  | "produced_by"
  | "arranged_by"
  | "written_by"
  | "lead_vocals"
  | "background_vocals"
  | "drums"
  | "percussion"
  | "mixing_engineer"
  | "mastering_engineer"
  | "artwork";

const CREDIT_ROLES: Array<{ key: CreditRoleKey; label: string }> = [
  { key: "produced_by", label: "Produced By" },
  { key: "arranged_by", label: "Arranged By" },
  { key: "written_by", label: "Written By" },
  { key: "lead_vocals", label: "Lead Vocals" },
  { key: "background_vocals", label: "Background Vocals" },
  { key: "drums", label: "Drums" },
  { key: "percussion", label: "Percussion" },
  { key: "mixing_engineer", label: "Mixing Engineer" },
  { key: "mastering_engineer", label: "Mastering Engineer" },
  { key: "artwork", label: "Artwork" },
];

type CreditState = Record<CreditRoleKey, string[]>;

function emptyCredits(): CreditState {
  return {
    produced_by: [],
    arranged_by: [],
    written_by: [],
    lead_vocals: [],
    background_vocals: [],
    drums: [],
    percussion: [],
    mixing_engineer: [],
    mastering_engineer: [],
    artwork: [],
  };
}

function creditsFromTrack(c: TrackCredits | null | undefined): CreditState {
  const base = emptyCredits();
  if (!c) return base;
  for (const { key } of CREDIT_ROLES) {
    const v = c[key];
    if (Array.isArray(v)) base[key] = v.filter((s): s is string => typeof s === "string");
  }
  return base;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function countWords(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

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
  credits: CreditState;
  lyrics: string;
  has_lyrics: boolean;
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
    credits: emptyCredits(),
    lyrics: "",
    has_lyrics: false,
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
    credits: creditsFromTrack(t.credits),
    lyrics: t.lyrics ?? "",
    has_lyrics: !!t.has_lyrics,
    is_downloadable: t.is_downloadable,
    is_published: t.is_published,
  };
}

function CreditChipInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };

  const remove = (name: string) => onChange(values.filter((x) => x !== name));

  return (
    <div className="space-y-1.5">
      <span className="block text-xs text-white/60">{label}</span>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-[#3DD6C8]/40 bg-[#3DD6C8]/10 px-2.5 py-1 text-xs text-white"
            >
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                aria-label={`Remove ${name}`}
                className="rounded-full p-0.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="Add name..."
          className="flex-1 rounded border border-white/15 bg-transparent px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#3DD6C8]"
        />
        <button
          type="button"
          onClick={commit}
          aria-label={`Add ${label}`}
          className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/5 hover:text-white"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
    </div>
  );
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

  const selectedSlug = form.album_id
    ? (albums.find((a) => a.id === form.album_id)?.slug ?? null)
    : "_singles";
  const audioFolderReady = !!selectedSlug;
  const publicAudioFolder = selectedSlug
    ? `ntp/audio/public/${selectedSlug}`
    : "ntp/audio/public/_singles";
  const vaultAudioFolder = selectedSlug
    ? `ntp/audio/vault/${selectedSlug}`
    : "ntp/audio/vault/_singles";

  const lyricsTrimmed = form.lyrics.trim();
  const hasLyricsContent = lyricsTrimmed.length > 0;
  const albumName =
    albums.find((a) => a.id === form.album_id)?.title ?? "—";
  const headerText = initial
    ? `Editing: ${initial.title} — ${albumName}`
    : form.title.trim()
      ? `New track: ${form.title.trim()} — ${albumName}`
      : "New track";

  function setCreditsRole(role: CreditRoleKey, next: string[]) {
    setForm((f) => ({ ...f, credits: { ...f.credits, [role]: next } }));
  }

  function downloadLyrics() {
    if (!hasLyricsContent) return;
    const title = form.title.trim() || initial?.title || "Untitled";
    const album = albums.find((a) => a.id === form.album_id)?.title ?? "—";
    const body = `Track: ${title}\nAlbum: ${album}\nArtist: Jhodge\n\n${form.lyrics}\n\n© Nano Tech Productions. All rights reserved.\n`;
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const slug = slugify(title) || "track";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-lyrics.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const credits: CreditState = { ...emptyCredits(), ...form.credits };
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
        credits,
        lyrics: hasLyricsContent ? form.lyrics : null,
        has_lyrics: hasLyricsContent && form.has_lyrics,
        is_downloadable: form.is_downloadable,
        is_published: form.is_published,
      };
      const url = initial
        ? `/api/admin/tracks/${initial.id}`
        : "/api/admin/tracks";
      const method = initial ? "PATCH" : "POST";
      const res = await adminFetch(url, {
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
    <form onSubmit={onSubmit} className="space-y-3 pb-20 text-white">
      <div className="rounded border border-[#3DD6C8]/30 bg-[#3DD6C8]/5 px-4 py-3">
        <div className="font-mono text-base font-bold text-[#3DD6C8]">
          {headerText}
        </div>
      </div>

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
        folder={publicAudioFolder}
        stripPrefix="ntp/audio/public"
        resourceType="video"
        accept="audio/*"
        label="Public audio (streaming MP3/WAV)"
        helpText={`Streamed from public CDN as MP3 320kbps. Uploads to /${publicAudioFolder}.`}
        disabled={!audioFolderReady}
        disabledReason="Album not found — pick a valid album to enable upload."
        currentPublicId={form.public_audio_id || null}
        onUploaded={(r) => {
          console.log("[TrackForm] public audio uploaded:", {
            publicId: r.publicId,
            url: r.url,
            bytes: r.bytes,
            format: r.format,
          });
          set("public_audio_id", r.publicId);
          set("audio_url", r.url);
        }}
        onClear={() => {
          set("public_audio_id", "");
          set("audio_url", "");
        }}
      />

      <CloudinaryUploader
        folder={vaultAudioFolder}
        stripPrefix="ntp/audio/vault"
        resourceType="video"
        accept="audio/wav,audio/x-wav,audio/aiff"
        label="Master WAV file"
        helpText={`Private vault — admin-only, signed access. Uploads to /${vaultAudioFolder}.`}
        vault
        disabled={!audioFolderReady}
        disabledReason="Album not found — pick a valid album to enable upload."
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

      <fieldset className="space-y-3 rounded border border-white/10 px-4 py-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
          Production Credits
        </legend>
        <p className="text-[11px] text-white/40">
          For: <span className="text-white/70">{initial?.title ?? (form.title.trim() || "this track")}</span>
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {CREDIT_ROLES.map((r) => (
            <CreditChipInput
              key={r.key}
              label={r.label}
              values={form.credits[r.key]}
              onChange={(next) => setCreditsRole(r.key, next)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded border border-white/10 px-4 py-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
          Lyrics
        </legend>
        <p className="text-[11px] text-white/40">
          For: <span className="text-white/70">{initial?.title ?? (form.title.trim() || "this track")}</span>
        </p>
        <textarea
          value={form.lyrics}
          onChange={(e) => {
            const v = e.target.value;
            setForm((f) => ({
              ...f,
              lyrics: v,
              has_lyrics: v.trim().length === 0 ? false : f.has_lyrics,
            }));
          }}
          placeholder={
            "Enter lyrics here...\n\nUse blank lines to separate verses.\nUse [Verse 1], [Chorus], [Bridge] etc. to label sections."
          }
          spellCheck={false}
          className="w-full rounded border border-white/20 bg-transparent p-3 font-mono text-[14px] leading-[1.8] text-white outline-none placeholder:text-white/30 focus:border-[#3DD6C8]"
          style={{ minHeight: 400, resize: "vertical" }}
        />
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <span>{countWords(form.lyrics)} words</span>
          <span>{form.lyrics.length} characters</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.has_lyrics}
              disabled={!hasLyricsContent}
              onChange={(e) => set("has_lyrics", e.target.checked)}
            />
            <span className={`text-sm ${hasLyricsContent ? "text-white" : "text-white/40"}`}>
              Show lyrics button in player
            </span>
          </label>
          {hasLyricsContent ? (
            <button
              type="button"
              onClick={downloadLyrics}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 hover:text-white"
            >
              <Download size={12} />
              Download as .txt
            </button>
          ) : null}
        </div>
      </fieldset>

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

      <div className="sticky bottom-0 z-10 flex gap-2 border-t border-white/10 bg-[#1a1919]/95 py-3 backdrop-blur-sm">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-[#3DD6C8] px-4 py-2 font-medium text-[#121212] disabled:opacity-50"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Create track"}
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
