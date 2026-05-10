"use client";

import { useEffect, useMemo, useState } from "react";
import { Apple, Globe, Search, X } from "lucide-react";
import { CloudinaryUploader } from "@/components/admin/CloudinaryUploader";

export type AdminTrackOption = {
  id: string;
  title: string;
  albumTitle: string | null;
};

export type AdminAlbumOption = {
  id: string;
  title: string;
};

type AssociationRole = "featured" | "producer" | "writer" | "engineer";
const ASSOC_ROLES: Array<{ key: AssociationRole; label: string }> = [
  { key: "featured", label: "Featured" },
  { key: "producer", label: "Producer" },
  { key: "writer", label: "Writer" },
  { key: "engineer", label: "Engineer" },
];

const ARTIST_ROLES: Array<{ key: string; label: string }> = [
  { key: "primary", label: "Primary Artist" },
  { key: "featured", label: "Featured Artist" },
  { key: "producer", label: "Producer" },
  { key: "songwriter", label: "Songwriter" },
  { key: "engineer", label: "Engineer" },
];

const SLUG_RE = /^[a-z0-9_-]+$/;
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Assoc = { id: string; role: AssociationRole };

type FormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  role: string;
  location: string;
  bio: string;
  profileImage: string;
  bannerImage: string;
  spotifyUrl: string;
  appleMusicUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: string;
};

function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
    slugTouched: false,
    role: "featured",
    location: "",
    bio: "",
    profileImage: "",
    bannerImage: "",
    spotifyUrl: "",
    appleMusicUrl: "",
    youtubeUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    websiteUrl: "",
    isFeatured: false,
    isPublished: false,
    sortOrder: "0",
  };
}

type LoadedArtist = {
  artist: Record<string, unknown>;
  tracks: Array<{ id: string; title: string; albumTitle: string | null; role: string }>;
  albums: Array<{ id: string; title: string; role: string }>;
};

type Props = {
  artistId?: string;
  allTracks: AdminTrackOption[];
  allAlbums: AdminAlbumOption[];
  onSaved: () => void;
  onCancel: () => void;
};

export function ArtistForm({
  artistId,
  allTracks,
  allAlbums,
  onSaved,
  onCancel,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [trackAssocs, setTrackAssocs] = useState<Assoc[]>([]);
  const [albumAssocs, setAlbumAssocs] = useState<Assoc[]>([]);
  const [trackSearch, setTrackSearch] = useState("");
  const [albumSearch, setAlbumSearch] = useState("");
  const [loading, setLoading] = useState(!!artistId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tracksById = useMemo(
    () => new Map(allTracks.map((t) => [t.id, t])),
    [allTracks],
  );
  const albumsById = useMemo(
    () => new Map(allAlbums.map((a) => [a.id, a])),
    [allAlbums],
  );

  // Load existing artist when editing.
  useEffect(() => {
    if (!artistId) return;
    let cancelled = false;
    fetch(`/api/admin/artists/${artistId}`)
      .then((r) => (r.ok ? (r.json() as Promise<LoadedArtist>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        const a = data.artist as Record<string, unknown>;
        setForm({
          name: String(a.name ?? ""),
          slug: String(a.slug ?? ""),
          slugTouched: true,
          role: String(a.role ?? "featured"),
          location: String(a.location ?? ""),
          bio: String(a.bio ?? ""),
          profileImage: String(a.profile_image ?? ""),
          bannerImage: String(a.banner_image ?? ""),
          spotifyUrl: String(a.spotify_url ?? ""),
          appleMusicUrl: String(a.apple_music_url ?? ""),
          youtubeUrl: String(a.youtube_url ?? ""),
          instagramUrl: String(a.instagram_url ?? ""),
          twitterUrl: String(a.twitter_url ?? ""),
          websiteUrl: String(a.website_url ?? ""),
          isFeatured: !!a.is_featured,
          isPublished: !!a.is_published,
          sortOrder: String(a.sort_order ?? 0),
        });
        setTrackAssocs(
          data.tracks.map((t) => ({
            id: t.id,
            role: (t.role as AssociationRole) || "featured",
          })),
        );
        setAlbumAssocs(
          data.albums.map((a) => ({
            id: a.id,
            role: (a.role as AssociationRole) || "featured",
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load artist");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: f.slugTouched ? f.slug : slugify(name),
    }));
  }

  function handleSlugChange(raw: string) {
    setForm((f) => ({
      ...f,
      slug: raw.toLowerCase().replace(/\s+/g, "-"),
      slugTouched: true,
    }));
  }

  const slugValid = SLUG_RE.test(form.slug);
  const profileFolder = slugValid
    ? `ntp/artists/${form.slug}/profile`
    : "ntp/artists/_pending/profile";
  const bannerFolder = slugValid
    ? `ntp/artists/${form.slug}/banner`
    : "ntp/artists/_pending/banner";

  const trackMatches = useMemo(() => {
    const q = trackSearch.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(trackAssocs.map((a) => a.id));
    return allTracks
      .filter((t) => !taken.has(t.id) && t.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [trackSearch, trackAssocs, allTracks]);

  const albumMatches = useMemo(() => {
    const q = albumSearch.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(albumAssocs.map((a) => a.id));
    return allAlbums
      .filter((a) => !taken.has(a.id) && a.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [albumSearch, albumAssocs, allAlbums]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.slug || !slugValid) {
      setError("Slug is required (lowercase letters, digits, _ or -).");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug,
        role: form.role,
        location: form.location.trim() || null,
        bio: form.bio.trim() || null,
        profile_image: form.profileImage || null,
        banner_image: form.bannerImage || null,
        spotify_url: form.spotifyUrl.trim() || null,
        apple_music_url: form.appleMusicUrl.trim() || null,
        youtube_url: form.youtubeUrl.trim() || null,
        instagram_url: form.instagramUrl.trim() || null,
        twitter_url: form.twitterUrl.trim() || null,
        website_url: form.websiteUrl.trim() || null,
        is_featured: form.isFeatured,
        is_published: form.isPublished,
        sort_order: Number.isFinite(Number(form.sortOrder))
          ? Number(form.sortOrder)
          : 0,
        tracks: trackAssocs,
        albums: albumAssocs,
      };

      const url = artistId
        ? `/api/admin/artists/${artistId}`
        : "/api/admin/artists";
      const method = artistId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? res.statusText);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-white/60">Loading artist…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 text-white">
      {error ? (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {/* BASIC INFO */}
      <Section title="Basic Info">
        <Label text="Name *">
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className={inputCls}
          />
        </Label>
        <Label text="Slug *">
          <input
            type="text"
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            placeholder="auto-generated-from-name"
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-white/40">
            Page URL: /artist/{form.slug || "[slug]"}
          </p>
        </Label>
        <Label text="Role">
          <select
            value={form.role}
            onChange={(e) => setField("role", e.target.value)}
            className={inputCls}
          >
            {ARTIST_ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Location">
          <input
            type="text"
            value={form.location}
            onChange={(e) => setField("location", e.target.value)}
            placeholder="e.g. Atlanta, GA"
            className={inputCls}
          />
        </Label>
        <Label text="Bio">
          <textarea
            value={form.bio}
            onChange={(e) => setField("bio", e.target.value)}
            className={`${inputCls} font-mono text-[13px] leading-[1.7]`}
            style={{ minHeight: 200, resize: "vertical" }}
          />
        </Label>
      </Section>

      {/* IMAGES */}
      <Section title="Images">
        <CloudinaryUploader
          folder={profileFolder}
          stripPrefix="ntp/artists"
          resourceType="image"
          accept="image/*"
          label="Profile Photo"
          helpText={`Uploads to /${profileFolder}.`}
          disabled={!slugValid}
          disabledReason="Set a slug first."
          currentUrl={form.profileImage || null}
          onUploaded={(r) => setField("profileImage", r.url)}
          onClear={() => setField("profileImage", "")}
        />
        {form.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.profileImage}
            alt="Profile preview"
            className="h-[100px] w-[100px] rounded-full object-cover"
          />
        ) : null}
        <CloudinaryUploader
          folder={bannerFolder}
          stripPrefix="ntp/artists"
          resourceType="image"
          accept="image/*"
          label="Banner Image (recommended 1400×300px)"
          helpText={`Uploads to /${bannerFolder}.`}
          disabled={!slugValid}
          disabledReason="Set a slug first."
          currentUrl={form.bannerImage || null}
          onUploaded={(r) => setField("bannerImage", r.url)}
          onClear={() => setField("bannerImage", "")}
        />
        {form.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.bannerImage}
            alt="Banner preview"
            className="h-[80px] w-full rounded object-cover"
          />
        ) : null}
      </Section>

      {/* SOCIAL LINKS */}
      <Section title="Social Links">
        <SocialInput
          icon={<SpotifyIcon />}
          label="Spotify"
          value={form.spotifyUrl}
          onChange={(v) => setField("spotifyUrl", v)}
        />
        <SocialInput
          icon={<Apple size={16} />}
          label="Apple Music"
          value={form.appleMusicUrl}
          onChange={(v) => setField("appleMusicUrl", v)}
        />
        <SocialInput
          icon={<YoutubeIcon />}
          label="YouTube"
          value={form.youtubeUrl}
          onChange={(v) => setField("youtubeUrl", v)}
        />
        <SocialInput
          icon={<InstagramIcon />}
          label="Instagram"
          value={form.instagramUrl}
          onChange={(v) => setField("instagramUrl", v)}
        />
        <SocialInput
          icon={<TwitterIcon />}
          label="Twitter / X"
          value={form.twitterUrl}
          onChange={(v) => setField("twitterUrl", v)}
        />
        <SocialInput
          icon={<Globe size={16} />}
          label="Website"
          value={form.websiteUrl}
          onChange={(v) => setField("websiteUrl", v)}
        />
      </Section>

      {/* SETTINGS */}
      <Section title="Settings">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setField("isFeatured", e.target.checked)}
          />
          <span className="text-sm">Show on home page and /artists</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setField("isPublished", e.target.checked)}
          />
          <span className="text-sm">Make artist page public</span>
        </label>
        <Label text="Sort Order">
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setField("sortOrder", e.target.value)}
            className={inputCls}
          />
        </Label>
      </Section>

      {/* TRACK ASSOCIATIONS */}
      <Section title="Track Associations">
        <AssocSearch
          placeholder="Search tracks..."
          value={trackSearch}
          onChange={setTrackSearch}
        />
        {trackMatches.length > 0 ? (
          <ul className="mt-2 max-h-48 overflow-y-auto rounded border border-white/10 bg-black/30">
            {trackMatches.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setTrackAssocs((prev) => [
                      ...prev,
                      { id: t.id, role: "featured" },
                    ]);
                    setTrackSearch("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  <span>
                    {t.title}{" "}
                    {t.albumTitle ? (
                      <span className="text-white/50">— {t.albumTitle}</span>
                    ) : null}
                  </span>
                  <span className="text-[#3DD6C8]">+</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 space-y-1.5">
          {trackAssocs.map((a) => {
            const t = tracksById.get(a.id);
            return (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-3 py-1.5"
              >
                <span className="flex-1 truncate text-sm">
                  {t?.title ?? "(missing track)"}
                  {t?.albumTitle ? (
                    <span className="text-white/50"> ({t.albumTitle})</span>
                  ) : null}
                </span>
                <select
                  value={a.role}
                  onChange={(e) =>
                    setTrackAssocs((prev) =>
                      prev.map((x) =>
                        x.id === a.id
                          ? { ...x, role: e.target.value as AssociationRole }
                          : x,
                      ),
                    )
                  }
                  className="rounded border border-white/15 bg-transparent px-2 py-1 text-xs"
                >
                  {ASSOC_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setTrackAssocs((prev) => prev.filter((x) => x.id !== a.id))
                  }
                  aria-label="Remove"
                  className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ALBUM ASSOCIATIONS */}
      <Section title="Album Associations">
        <AssocSearch
          placeholder="Search albums..."
          value={albumSearch}
          onChange={setAlbumSearch}
        />
        {albumMatches.length > 0 ? (
          <ul className="mt-2 max-h-48 overflow-y-auto rounded border border-white/10 bg-black/30">
            {albumMatches.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setAlbumAssocs((prev) => [
                      ...prev,
                      { id: a.id, role: "featured" },
                    ]);
                    setAlbumSearch("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  <span>{a.title}</span>
                  <span className="text-[#3DD6C8]">+</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 space-y-1.5">
          {albumAssocs.map((a) => {
            const album = albumsById.get(a.id);
            return (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-3 py-1.5"
              >
                <span className="flex-1 truncate text-sm">
                  {album?.title ?? "(missing album)"}
                </span>
                <select
                  value={a.role}
                  onChange={(e) =>
                    setAlbumAssocs((prev) =>
                      prev.map((x) =>
                        x.id === a.id
                          ? { ...x, role: e.target.value as AssociationRole }
                          : x,
                      ),
                    )
                  }
                  className="rounded border border-white/15 bg-transparent px-2 py-1 text-xs"
                >
                  {ASSOC_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setAlbumAssocs((prev) => prev.filter((x) => x.id !== a.id))
                  }
                  aria-label="Remove"
                  className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="flex items-center gap-3 border-t border-white/10 pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-[#3DD6C8] px-5 py-2 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Saving…" : artistId ? "Save Changes" : "Create Artist"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-white/15 px-5 py-2 text-sm text-white/70 hover:border-white/30 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#3DD6C8]";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded border border-white/10 px-4 py-4">
      <legend className="px-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Label({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-white/70">{text}</span>
      {children}
    </label>
  );
}

function AssocSearch({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded border border-white/15 px-3 py-2">
      <Search size={14} className="text-white/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function SocialInput({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70">
        {icon}
      </span>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${label} URL`}
        className={inputCls}
      />
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.624.624 0 0 1-.86.207c-2.357-1.44-5.323-1.767-8.815-.969a.624.624 0 1 1-.277-1.217c3.821-.872 7.099-.494 9.745 1.123a.624.624 0 0 1 .207.856zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.696-1.658-6.81-2.138-9.997-1.169a.78.78 0 1 1-.455-1.494c3.642-1.105 8.176-.568 11.27 1.334a.78.78 0 0 1 .254 1.072zm.106-2.835c-3.234-1.92-8.57-2.097-11.657-1.16a.936.936 0 1 1-.546-1.79c3.539-1.075 9.428-.866 13.144 1.34a.936.936 0 1 1-.94 1.61z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
