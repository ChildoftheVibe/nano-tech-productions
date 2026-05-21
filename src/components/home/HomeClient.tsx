"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, type Variants } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { AlbumCard } from "@/components/music/AlbumCard";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { usePlayerStore } from "@/store/playerStore";
import { usePlayer } from "@/context/PlayerContext";
import { usePageEngagement } from "@/lib/usePageEngagement";
import type { Album, AlbumListResult, Artist } from "@/types/music";
import { getAlbumCover } from "@/lib/albumCover";

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

const containerStagger: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemFadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

const sectionHeader: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const, delay: 0.1 },
  },
};

type Props = {
  featured: Album[];
  latest: Album | null;
  initialCollection: AlbumListResult;
  featuredArtists: Artist[];
  eps: Album[];
};

export function HomeClient({
  featured,
  latest,
  initialCollection,
  featuredArtists,
  eps,
}: Props) {
  const greeting = useSyncExternalStore(
    subscribeNoop,
    getClientGreeting,
    getServerGreeting,
  );

  usePageEngagement("/");

  const { playFromAlbum, togglePlayPause } = usePlayer();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [collection, setCollection] = useState<Album[]>(initialCollection.albums);
  const [hasMore, setHasMore] = useState(initialCollection.hasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const firstLoadRef = useRef(true);
  const [animateFirst, setAnimateFirst] = useState(false);
  useEffect(() => {
    if (firstLoadRef.current) {
      setAnimateFirst(true);
      firstLoadRef.current = false;
    }
  }, []);

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
    <div className="px-4 md:px-8 pt-4 md:pt-6 pb-12 md:pb-16">
      <motion.section
        className="pb-8 md:pb-12"
        initial={animateFirst ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <h1 className="text-2xl font-bold text-white md:text-4xl">{greeting}</h1>
      </motion.section>

      <section className="pb-12 md:pb-16">
        <motion.div
          className="mb-6 md:mb-8 flex items-baseline justify-between"
          initial={animateFirst ? "hidden" : false}
          animate="visible"
          variants={sectionHeader}
        >
          <h2 className="text-xl font-bold text-white">Featured</h2>
        </motion.div>
        {featured.length === 0 ? (
          <div className="rounded-md border border-white/10 p-6 text-sm text-[#B3B3B3]">
            No albums yet. Run the seed script to populate the catalog.
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-8 md:px-8">
            <motion.div
              className="flex snap-x snap-mandatory gap-6 md:gap-8 pb-2"
              variants={containerStagger}
              initial={animateFirst ? "hidden" : false}
              animate="visible"
            >
              {featured.map((album, idx) => (
                <motion.div
                  key={album.id}
                  className="w-[180px] flex-shrink-0 snap-start"
                  variants={itemFadeUp}
                >
                  <AlbumCard
                    album={album}
                    size="md"
                    href={`/album/${album.slug}`}
                    showHoverPlay
                    onPlay={() => playFromAlbum(album)}
                    priority={idx < 6}
                    fetchPriority={idx < 3 ? "high" : undefined}
                  />
                  <div className="mt-2 truncate text-sm font-semibold text-white">
                    <Link href={`/album/${album.slug}`} className="hover:underline">
                      {album.title}
                    </Link>
                  </div>
                  <div className="text-xs text-[#B3B3B3]">
                    {album.releaseDate?.slice(0, 4) ?? ""}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </section>

      {eps.length > 0 && (
        <section className="pb-12 md:pb-16">
          <motion.div
            className="mb-6 md:mb-8 flex items-baseline justify-between"
            initial={animateFirst ? "hidden" : false}
            animate="visible"
            variants={sectionHeader}
          >
            <h2 className="text-xl font-bold text-white">EPs</h2>
          </motion.div>
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-8 md:px-8">
            <motion.div
              className="flex snap-x snap-mandatory gap-6 md:gap-8 pb-2"
              variants={containerStagger}
              initial={animateFirst ? "hidden" : false}
              animate="visible"
            >
              {eps.map((ep) => (
                <motion.div
                  key={ep.id}
                  className="w-[180px] flex-shrink-0 snap-start"
                  variants={itemFadeUp}
                >
                  <AlbumCard
                    album={ep}
                    size="md"
                    href={`/album/${ep.slug}`}
                    showHoverPlay
                    onPlay={() => playFromAlbum(ep)}
                  />
                  <div className="mt-2 truncate text-sm font-semibold text-white">
                    <Link href={`/album/${ep.slug}`} className="hover:underline">
                      {ep.title}
                    </Link>
                  </div>
                  <div className="text-xs text-[#B3B3B3]">
                    {ep.releaseDate?.slice(0, 4) ?? ""}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {latest ? (
        <section className="pb-12 md:pb-16">
          <motion.div
            className="mb-6 md:mb-8 flex items-baseline justify-between"
            initial={animateFirst ? "hidden" : false}
            animate="visible"
            variants={sectionHeader}
          >
            <h2 className="text-xl font-bold text-white">Latest Releases</h2>
          </motion.div>
          <motion.div
            className="overflow-hidden rounded-xl"
            initial={animateFirst ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              background: `linear-gradient(135deg, ${latest.bgColor} 0%, #1a0838 60%, #393838 100%)`,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8 lg:p-12">
              <motion.div
                className="hidden md:block"
                initial={animateFirst ? { scale: 0.95, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <AlbumCard album={latest} size="lg" href={`/album/${latest.slug}`} />
              </motion.div>
              <motion.div
                className="md:hidden"
                initial={animateFirst ? { scale: 0.95, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <AlbumCard album={latest} size="md" href={`/album/${latest.slug}`} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
                  Latest Release
                </div>
                <h3 className="mb-3 text-2xl font-extrabold text-white md:text-5xl">
                  {latest.title}
                </h3>
                <div className="mb-4 text-sm text-[#B3B3B3]">
                  Jhodge ·{" "}
                  {latest.releaseDate
                    ? new Date(latest.releaseDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : ""}
                </div>
                <p className="mb-6 line-clamp-2 max-w-2xl text-sm text-white/80">
                  {latest.description}
                </p>
                <div className="flex flex-wrap gap-4">
                  <motion.button
                    onClick={() => playFromAlbum(latest)}
                    disabled={!latest.tracks.length}
                    className="flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-bold text-black disabled:opacity-40"
                    style={{ background: latest.accentColor }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Play size={16} fill="currentColor" />
                    Play
                  </motion.button>
                  <Link
                    href={`/album/${latest.slug}`}
                    className="ntv-btn flex items-center gap-2 rounded-full border border-white/30 px-5 py-1.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    View Album
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      ) : null}

      {featuredArtists.length > 0 ? (
        <section className="pb-10 md:pb-12">
          <motion.div
            className="mb-6 md:mb-8 flex items-baseline justify-between"
            initial={animateFirst ? "hidden" : false}
            animate="visible"
            variants={sectionHeader}
          >
            <h2 className="text-xl font-bold text-white">Featured Artists</h2>
          </motion.div>
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-8 md:px-8">
            <motion.div
              className="flex snap-x snap-mandatory gap-4 md:gap-6 pb-2"
              variants={containerStagger}
              initial={animateFirst ? "hidden" : false}
              animate="visible"
            >
              {featuredArtists.map((artist) => (
                <motion.div
                  key={artist.id}
                  className="w-[220px] flex-shrink-0 snap-start"
                  variants={itemFadeUp}
                >
                  <ArtistCard artist={artist} size="md" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      ) : null}

      <section className="pb-10 md:pb-12">
        <motion.div
          className="mb-6 md:mb-8 flex items-baseline justify-between"
          initial={animateFirst ? "hidden" : false}
          animate="visible"
          variants={sectionHeader}
        >
          <h2 className="text-xl font-bold text-white">The Collection</h2>
          <span className="text-xs text-[#B3B3B3]">
            {collection.length} of {initialCollection.totalCount}
          </span>
        </motion.div>
        <motion.div
          className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6"
          variants={containerStagger}
          initial={animateFirst ? "hidden" : false}
          animate="visible"
        >
          {collection.map((album) => (
            <motion.div key={album.id} variants={itemFadeUp}>
              <Link
                href={`/album/${album.slug}`}
                className="group flex flex-col gap-3 rounded-md p-3 transition-colors hover:bg-white/5 md:flex-row md:gap-4 md:p-4"
              >
                {/* Mobile: square responsive cover */}
                <div
                  className="aspect-square w-full overflow-hidden rounded-md md:hidden"
                  style={{ background: album.bgColor }}
                >
                  {album.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAlbumCover(album.coverImage, "md")}
                      alt={album.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                {/* Desktop: AlbumCard with hover play */}
                <div className="hidden md:block">
                  <AlbumCard
                    album={album}
                    size="md"
                    showHoverPlay
                    onPlay={() => playFromAlbum(album)}
                  />
                </div>
                <div className="min-w-0 flex-1 md:pt-3">
                  <div className="truncate text-sm font-semibold text-white md:text-base">
                    {album.title}
                  </div>
                  <div className="mt-1 text-xs text-[#B3B3B3]">
                    {album.releaseDate?.slice(0, 4)} · {album.tracks.length} songs
                  </div>
                  <p className="mt-3 hidden line-clamp-3 text-xs text-white/60 md:block">
                    {album.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
        {hasMore ? (
          <div className="mt-6 flex justify-center">
            <motion.button
              onClick={loadMore}
              disabled={loading}
              className="rounded-full border border-white/20 bg-black/20 px-6 py-1.5 text-sm font-semibold text-white hover:bg-black/40 disabled:opacity-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              {loading ? "Loading…" : "Load More"}
            </motion.button>
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
              <motion.button
                onClick={togglePlayPause}
                className="mt-3 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold text-black"
                style={{
                  background: currentAlbum?.accentColor ?? "#3DD6C8",
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
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
              </motion.button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
