"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Clock, Disc3, Mic2, Music, SearchX, X } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchResultsSkeleton } from "@/components/ui/skeletons/SearchResultsSkeleton";
import type { Album } from "@/types/music";
import type { SearchArtist, SearchResult, SearchTrack } from "@/lib/queries";

type SearchResponse = SearchResult & { query: string; tooShort: boolean };

const RECENT_KEY = "ntv-recent-searches";
const RECENT_MAX = 10;
const DEBOUNCE_MS = 300;

type FlatItem =
  | { kind: "album"; href: string; album: Album }
  | { kind: "track"; href: string; track: SearchTrack }
  | { kind: "artist"; href: string; artist: SearchArtist };

// External store for recent searches so components can subscribe via
// useSyncExternalStore without setState-in-effect.
const EMPTY_RECENT: string[] = [];
let recentCache: string[] | null = null;
const recentListeners = new Set<() => void>();

function readRecentRaw(): string[] {
  if (typeof window === "undefined") return EMPTY_RECENT;
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return EMPTY_RECENT;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_RECENT;
    return parsed
      .filter((s): s is string => typeof s === "string")
      .slice(0, RECENT_MAX);
  } catch {
    return EMPTY_RECENT;
  }
}

function getRecentSnapshot(): string[] {
  if (recentCache === null) recentCache = readRecentRaw();
  return recentCache;
}
function getServerRecentSnapshot(): string[] {
  return EMPTY_RECENT;
}
function subscribeRecent(cb: () => void): () => void {
  recentListeners.add(cb);
  return () => recentListeners.delete(cb);
}
function notifyRecent() {
  recentCache = null;
  for (const cb of recentListeners) cb();
}
function writeRecent(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(list.slice(0, RECENT_MAX)),
    );
  } catch {
    /* ignore quota errors */
  }
  notifyRecent();
}
function pushRecent(query: string) {
  const q = query.trim();
  if (!q) return;
  const existing = readRecentRaw().filter(
    (s) => s.toLowerCase() !== q.toLowerCase(),
  );
  writeRecent([q, ...existing].slice(0, RECENT_MAX));
}
function removeRecent(q: string) {
  writeRecent(readRecentRaw().filter((s) => s !== q));
}
function clearRecent() {
  writeRecent([]);
}

export function SearchPageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  const recent = useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    getServerRecentSnapshot,
  );

  // Debounce input → debounced state.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  // Sync URL when debounced query changes (shareable).
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (debounced === current) return;
    const next = debounced.trim()
      ? `/search?q=${encodeURIComponent(debounced.trim())}`
      : "/search";
    router.replace(next, { scroll: false });
  }, [debounced, params, router]);

  // Fetch results when debounced query is long enough. setState only happens
  // inside fetch callbacks (external system updates), not synchronously in the
  // effect body. Loading state is derived below from (debounced vs result.query).
  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) return;
    let cancelled = false;
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then(async (r) =>
        r.ok ? ((await r.json()) as SearchResponse) : null,
      )
      .then((json) => {
        if (cancelled) return;
        setResult(json);
        setHighlighted(0);
      })
      .catch(() => {
        if (cancelled) return;
        setResult(null);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // Flat list of all visible result items, in render order, for arrow-key nav.
  const flat: FlatItem[] = useMemo(() => {
    if (!result) return [];
    const out: FlatItem[] = [];
    for (const a of result.albums) {
      out.push({ kind: "album", href: `/album/${a.slug}`, album: a });
    }
    for (const t of result.tracks) {
      const href = t.albumSlug ? `/album/${t.albumSlug}` : "#";
      out.push({ kind: "track", href, track: t });
    }
    for (const a of result.artists) {
      const href = a.slug
        ? `/artist/${a.slug}`
        : `/search?q=${encodeURIComponent(a.name)}`;
      out.push({ kind: "artist", href, artist: a });
    }
    return out;
  }, [result]);

  const onKeyDownGlobal = useCallback(
    (e: KeyboardEvent) => {
      if (!flat.length) return;
      // Only intercept when not typing in an input/textarea (so SearchBar Esc
      // and normal typing aren't disturbed).
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => Math.min(flat.length - 1, h + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => Math.max(0, h - 1));
      } else if (e.key === "Enter" && !inField) {
        const item = flat[highlighted] ?? flat[0];
        if (item && item.href !== "#") {
          pushRecent(query);
          router.push(item.href);
        }
      }
    },
    [flat, highlighted, query, router],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDownGlobal);
    return () => window.removeEventListener("keydown", onKeyDownGlobal);
  }, [onKeyDownGlobal]);

  const trimmed = debounced.trim();
  const showEmpty = trimmed.length === 0;
  const showTooShort = trimmed.length > 0 && trimmed.length < 2;
  // Result is "fresh" only if its query matches what we're now searching for.
  const fresh = result !== null && result.query === trimmed;
  const loading = trimmed.length >= 2 && !fresh;
  const showResults = trimmed.length >= 2 && fresh;
  const showNoResults =
    showResults &&
    !loading &&
    !result.albums.length &&
    !result.tracks.length &&
    !result.artists.length;

  return (
    <div className="px-4 pt-4 pb-12 md:px-8">
      <h1 className="mb-4 text-2xl font-bold text-white md:mb-6 md:text-3xl">
        Search
      </h1>

      <div className="mb-6 max-w-2xl">
        <SearchBar
          mode="live"
          autoFocus
          value={query}
          placeholder="Search albums, tracks, artists…"
          className="flex h-11 items-center gap-2 rounded-full px-4 py-2"
          inputClassName="w-full bg-transparent text-base text-white placeholder-[#B3B3B3] outline-none"
          onChange={(v) => setQuery(v)}
          onSubmit={(v) => pushRecent(v)}
        />
      </div>

      {showEmpty ? (
        <div className="max-w-2xl">
          <p className="text-sm text-[#B3B3B3]">
            Search for albums, tracks, or artists.
          </p>
          {recent.length > 0 ? (
            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                  Recent searches
                </h2>
                <button
                  type="button"
                  onClick={clearRecent}
                  className="text-[11px] text-white/50 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <ul className="space-y-1">
                {recent.map((q) => (
                  <li
                    key={q}
                    className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-white/5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(q);
                        setDebounced(q);
                      }}
                      className="flex flex-1 items-center gap-2 text-left text-sm text-white"
                    >
                      <Clock size={14} className="text-white/40" />
                      <span>{q}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecent(q)}
                      aria-label={`Remove ${q} from recent searches`}
                      className="rounded-full p-1 text-white/40 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {showTooShort ? (
        <p className="text-sm text-[#B3B3B3]">
          Keep typing — at least 2 characters.
        </p>
      ) : null}

      {loading ? <SearchResultsSkeleton /> : null}

      {showNoResults ? (
        <EmptyState
          icon={<SearchX size={20} />}
          title={`No results for "${trimmed}"`}
          message="Try a different word, or check the spelling."
        />
      ) : null}

      {showResults && result && !showNoResults ? (
        <div className="space-y-8">
          {result.albums.length > 0 ? (
            <ResultSection
              title="Albums"
              icon={<Disc3 size={14} />}
              count={result.albums.length}
            >
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {result.albums.map((album, i) => {
                  const flatIndex = i;
                  return (
                    <li key={album.id}>
                      <Link
                        href={`/album/${album.slug}`}
                        onClick={() => pushRecent(query)}
                        className={`flex items-center gap-3 rounded-md p-2 transition-colors ${
                          highlighted === flatIndex
                            ? "bg-white/10"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div
                          className="h-12 w-12 flex-shrink-0 overflow-hidden rounded"
                          style={{ background: album.bgColor }}
                        >
                          {album.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={album.coverImage}
                              alt={album.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">
                            {album.title}
                          </div>
                          <div className="text-xs text-[#B3B3B3]">
                            Album · {album.releaseDate?.slice(0, 4) ?? ""}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </ResultSection>
          ) : null}

          {result.tracks.length > 0 ? (
            <ResultSection
              title="Tracks"
              icon={<Music size={14} />}
              count={result.tracks.length}
            >
              <ul className="space-y-1">
                {result.tracks.map((track, i) => {
                  const flatIndex = result.albums.length + i;
                  const href = track.albumSlug
                    ? `/album/${track.albumSlug}`
                    : "#";
                  return (
                    <li key={track.id}>
                      <Link
                        href={href}
                        onClick={(e) => {
                          if (href === "#") {
                            e.preventDefault();
                            return;
                          }
                          pushRecent(query);
                        }}
                        className={`flex items-center gap-3 rounded-md p-2 transition-colors ${
                          highlighted === flatIndex
                            ? "bg-white/10"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <Music size={16} className="text-white/40" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-white">
                            {track.title}
                          </div>
                          <div className="truncate text-xs text-[#B3B3B3]">
                            Jhodge
                            {track.features?.length
                              ? ` feat. ${track.features.join(", ")}`
                              : ""}
                          </div>
                        </div>
                        <span className="flex-shrink-0 text-xs text-[#B3B3B3]">
                          {track.duration}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </ResultSection>
          ) : null}

          {result.artists.length > 0 ? (
            <ResultSection
              title="Artists"
              icon={<Mic2 size={14} />}
              count={result.artists.length}
            >
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {result.artists.map((artist, i) => {
                  const flatIndex =
                    result.albums.length + result.tracks.length + i;
                  const href = artist.slug
                    ? `/artist/${artist.slug}`
                    : `/search?q=${encodeURIComponent(artist.name)}`;
                  const key = artist.slug
                    ? `slug:${artist.slug}`
                    : `name:${artist.name}`;
                  return (
                    <li key={key}>
                      <Link
                        href={href}
                        onClick={() => pushRecent(query)}
                        className={`flex items-center gap-2 rounded-md p-2 text-sm text-white transition-colors ${
                          highlighted === flatIndex
                            ? "bg-white/10"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <span
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-black"
                          style={{ background: "#3DD6C8" }}
                        >
                          {artist.profileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={artist.profileImage}
                              alt=""
                              aria-hidden
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            artist.name.charAt(0).toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {artist.name}
                          {artist.slug ? null : (
                            <span className="ml-1 text-[10px] uppercase tracking-wider text-white/40">
                              (no page)
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </ResultSection>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ResultSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[#3DD6C8]">{icon}</span>
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-white">
          {title}
        </h2>
        <span className="text-[11px] text-white/40">({count})</span>
      </div>
      {children}
    </section>
  );
}
