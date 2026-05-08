"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { AlbumCard } from "@/components/music/AlbumCard";
import { usePlayerStore } from "@/store/playerStore";
import type { Album, AlbumListResult } from "@/types/music";

const PAGE_SIZE =
  Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE) > 0
    ? Number(process.env.NEXT_PUBLIC_ALBUMS_PER_PAGE)
    : 20;

const greetingForHour = (h: number) => {
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
};
const subscribeNoop = () => () => {};
const getClientGreeting = () => greetingForHour(new Date().getHours());
const getServerGreeting = () => "Welcome";

type Props = {
  featured: Album[];
  latest: Album | null;
  initialCollection: AlbumListResult;
};

export function HomeClient({ featured, latest, initialCollection }: Props) {
  const greeting = useSyncExternalStore(
    subscribeNoop,
    getClientGreeting,
    getServerGreeting,
  );

  const playAlbum = usePlayerStore((s) => s.playAlbum);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [collection, setCollection] = useState<Album[]>(initialCollection.albums);
  const [hasMore, setHasMore] = useState(initialCollection.hasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await fetch(`/api/albums?page=${next}&limit=${PAGE_SIZE}`);
      if (!res.ok) return;
      const json = (await res.json()) as AlbumListResult;
      const known = new Set(collection.map((a) => a.id));
      const additions = json.albums.filter((a) => !known.has(a.id));
      setCollection((prev) => [...prev, ...additions]);
      setHasMore(json.hasMore);
      setPage(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 pt-2 pb-12 md:px-8">
      <section className="pt-2 pb-6">
        <h1 className="text-3xl font-bold text-white md:text-4xl">{greeting}</h1>
      </section>

      <section className="pb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-white">Featured</h2>
        </div>
        {featured.length === 0 ? (
          <div className="rounded-md border border-white/10 p-6 text-sm text-[#B3B3B3]">
            No albums yet. Run the seed script to populate the catalog.
          </div>
        ) : (
          <div className="-mx-6 overflow-x-auto px-6 md:-mx-8 md:px-8">
            <div className="flex gap-4 pb-2">
              {featured.map((album) => (
                <div key={album.id} className="w-[180px] flex-shrink-0">
                  <AlbumCard
                    album={album}
                    size="md"
                    href={`/album/${album.slug}`}
                    showHoverPlay
                    onPlay={() => playAlbum(album)}
                  />
                  <div className="mt-2 truncate text-sm font-semibold text-white">
                    <Link href={`/album/${album.slug}`} className="hover:underline">
                      {album.title}
                    </Link>
                  </div>
                  <div className="text-xs text-[#B3B3B3]">
                    {album.releaseDate?.slice(0, 4) ?? ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {latest ? (
        <section className="pb-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-white">Latest Release</h2>
          </div>
          <div
            className="overflow-hidden rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${latest.bgColor} 0%, #1a0838 60%, #393838 100%)`,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8">
              <AlbumCard album={latest} size="lg" href={`/album/${latest.slug}`} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
                  Latest Release
                </div>
                <h3 className="mb-2 text-3xl font-extrabold text-white md:text-5xl">
                  {latest.title}
                </h3>
                <div className="mb-3 text-sm text-[#B3B3B3]">
                  Jhodge ·{" "}
                  {latest.releaseDate
                    ? new Date(latest.releaseDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : ""}
                </div>
                <p className="mb-5 line-clamp-2 max-w-2xl text-sm text-white/80">
                  {latest.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => playAlbum(latest)}
                    disabled={!latest.tracks.length}
                    className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                    style={{ background: latest.accentColor }}
                  >
                    <Play size={16} fill="currentColor" />
                    Play
                  </button>
                  <Link
                    href={`/album/${latest.slug}`}
                    className="flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    View Album
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="pb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-white">The Collection</h2>
          <span className="text-xs text-[#B3B3B3]">
            {collection.length} of {initialCollection.totalCount}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collection.map((album) => (
            <Link
              key={album.id}
              href={`/album/${album.slug}`}
              className="group flex gap-4 rounded-md p-3 transition-colors hover:bg-white/5"
            >
              <AlbumCard
                album={album}
                size="md"
                showHoverPlay
                onPlay={() => playAlbum(album)}
              />
              <div className="min-w-0 flex-1 pt-2">
                <div className="truncate font-semibold text-white">{album.title}</div>
                <div className="text-xs text-[#B3B3B3]">
                  {album.releaseDate?.slice(0, 4)} · {album.tracks.length} songs
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-white/60">
                  {album.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
        {hasMore ? (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded-full border border-white/20 bg-black/20 px-6 py-2 text-sm font-semibold text-white hover:bg-black/40 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load More"}
            </button>
          </div>
        ) : null}
      </section>

      {currentTrack ? (
        <section className="pb-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-white">Now Playing</h2>
          </div>
          <div
            className="flex items-center gap-4 rounded-xl p-4"
            style={{
              background: currentAlbum
                ? `linear-gradient(135deg, ${currentAlbum.bgColor} 0%, #393838 100%)`
                : "#282828",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {currentAlbum ? (
              <AlbumCard
                album={currentAlbum}
                size="md"
                href={`/album/${currentAlbum.slug}`}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
                Currently Playing
              </div>
              <div className="mt-1 truncate text-2xl font-bold text-white">
                {currentTrack.title}
              </div>
              <div className="text-sm text-[#B3B3B3]">
                Jhodge
                {currentTrack.features?.length
                  ? ` feat. ${currentTrack.features.join(", ")}`
                  : ""}
                {currentAlbum ? ` · ${currentAlbum.title}` : ""}
              </div>
              <button
                onClick={togglePlay}
                className="mt-3 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold text-black"
                style={{
                  background: currentAlbum?.accentColor ?? "#3DD6C8",
                }}
              >
                {isPlaying ? (
                  <>
                    <Pause size={14} fill="currentColor" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    Resume
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
