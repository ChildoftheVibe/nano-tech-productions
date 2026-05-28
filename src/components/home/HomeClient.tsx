"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, type Variants } from "framer-motion";
import { Pause, Play, ChevronRight } from "lucide-react";
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

const PRIMARY_ARTIST = "Jhodge";

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
    transition: { staggerChildren: 0.06 },
  },
};

const itemFadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const sectionReveal: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut", delay: 0.05 },
  },
};

type Props = {
  featured: Album[];
  latest: Album | null;
  initialCollection: AlbumListResult;
  featuredArtists: Artist[];
};

function SectionLabel({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count?: string;
}) {
  return (
    <div>
      <div className="mb-2 h-px w-6 bg-[#3DD6C8]" />
      <div className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.28em] text-[#3DD6C8]">
        {eyebrow}
      </div>
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {count && (
          <span className="font-mono text-[11px] text-[#B3B3B3]">{count}</span>
        )}
      </div>
    </div>
  );
}

export function HomeClient({
  featured,
  latest,
  initialCollection,
  featuredArtists,
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

  const [collection, setCollection] = useState<Album[]>(
    initialCollection.albums,
  );
  const [hasMore, setHasMore] = useState(initialCollection.hasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    <div className="px-4 md:px-8 pt-6 md:pt-10 pb-12 md:pb-16">

      {/* ── HERO ── */}
      <motion.section
        className="pb-12 md:pb-16"
        initial={{ opacity: 0, y: 14 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#3DD6C8]">
          Nano Tech Vibe · The Vault
        </div>
        <h1 className="text-4xl font-black tracking-tight leading-[0.93] text-white md:text-6xl lg:text-7xl">
          {greeting}
          <span className="text-[#3DD6C8]">.</span>
        </h1>
        <p className="mt-4 max-w-xs text-sm text-[#B3B3B3] leading-relaxed md:max-w-sm">
          Music direct from the artist. No algorithm. No filter.
        </p>
      </motion.section>

      {/* ── FEATURED ── */}
      <section className="pb-12 md:pb-16">
        <motion.div
          className="mb-6 md:mb-8"
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          variants={sectionReveal}
        >
          <SectionLabel eyebrow="Curated" title="Featured" />
        </motion.div>
        {featured.length === 0 ? (
          <div className="rounded-md border border-white/10 p-6 text-sm text-[#B3B3B3]">
            No albums yet. Run the seed script to populate the catalog.
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-8 md:px-8">
            <motion.div
              className="flex snap-x snap-mandatory gap-5 md:gap-7 pb-2"
              variants={containerStagger}
              initial="hidden"
              animate={mounted ? "visible" : "hidden"}
            >
              {featured.map((album, idx) => (
                <motion.div
                  key={album.id}
                  className="w-[160px] flex-shrink-0 snap-start md:w-[190px]"
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
                  <div className="mt-2.5 space-y-1">
                    <div className="truncate text-sm font-semibold text-white leading-tight">
                      <Link
                        href={`/album/${album.slug}`}
                        className="hover:text-[#3DD6C8] transition-colors duration-200"
                      >
                        {album.title}
                      </Link>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#B3B3B3]">
                      {album.releaseDate?.slice(0, 4) ?? ""}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </section>

      {/* ── LATEST RELEASE ── */}
      {latest ? (
        <section className="pb-12 md:pb-16">
          <motion.div
            className="mb-6 md:mb-8"
            initial="hidden"
            animate={mounted ? "visible" : "hidden"}
            variants={sectionReveal}
          >
            <SectionLabel eyebrow="New Drop" title="Latest Release" />
          </motion.div>
          <motion.div
            className="overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: 14 }}
            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
            style={{
              background: `linear-gradient(135deg, ${latest.bgColor}cc 0%, #1a0838 55%, #181818 100%)`,
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-10 md:p-10 lg:p-12">
              {/* subtle grid texture */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 48px)`,
                }}
              />
              <motion.div
                className="relative flex-shrink-0"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={mounted ? { scale: 1, opacity: 1 } : { scale: 0.94, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <AlbumCard
                  album={latest}
                  size="lg"
                  href={`/album/${latest.slug}`}
                />
              </motion.div>
              <div className="relative min-w-0 flex-1">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] font-semibold"
                    style={{
                      background: `${latest.accentColor}1a`,
                      color: latest.accentColor,
                      border: `1px solid ${latest.accentColor}33`,
                    }}
                  >
                    Latest Release
                  </span>
                  {latest.tracks.length > 0 && (
                    <span className="font-mono text-[10px] text-[#B3B3B3] uppercase tracking-wider">
                      {latest.tracks.length}{" "}
                      {latest.tracks.length === 1 ? "Track" : "Tracks"}
                    </span>
                  )}
                </div>
                <h3 className="mb-3 text-3xl font-black tracking-tight leading-[0.92] text-white md:text-5xl lg:text-6xl">
                  {latest.title}
                </h3>
                <div className="mb-5 flex items-center gap-2 font-mono text-xs text-[#B3B3B3]">
                  <span>{PRIMARY_ARTIST}</span>
                  <span className="text-white/20">·</span>
                  <span>
                    {latest.releaseDate
                      ? new Date(latest.releaseDate).toLocaleDateString(
                          undefined,
                          { year: "numeric", month: "long" },
                        )
                      : ""}
                  </span>
                </div>
                {latest.description && (
                  <p className="mb-7 line-clamp-2 max-w-lg text-sm text-white/55 leading-relaxed">
                    {latest.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <motion.button
                    onClick={() => playFromAlbum(latest)}
                    disabled={!latest.tracks.length}
                    className="flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold text-black disabled:opacity-40"
                    style={{ background: latest.accentColor }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Play size={14} fill="currentColor" />
                    Play Now
                  </motion.button>
                  <Link
                    href={`/album/${latest.slug}`}
                    className="flex items-center gap-1.5 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
                  >
                    View Album
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      ) : null}

      {/* ── FEATURED ARTISTS ── */}
      {featuredArtists.length > 0 ? (
        <section className="pb-12 md:pb-14">
          <motion.div
            className="mb-6 md:mb-8"
            initial="hidden"
            animate={mounted ? "visible" : "hidden"}
            variants={sectionReveal}
          >
            <SectionLabel eyebrow="The Roster" title="Featured Artists" />
          </motion.div>
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-8 md:px-8">
            <motion.div
              className="flex snap-x snap-mandatory gap-4 md:gap-5 pb-2"
              variants={containerStagger}
              initial="hidden"
              animate={mounted ? "visible" : "hidden"}
            >
              {featuredArtists.map((artist) => (
                <motion.div
                  key={artist.id}
                  className="w-[200px] flex-shrink-0 snap-start md:w-[220px]"
                  variants={itemFadeUp}
                >
                  <ArtistCard artist={artist} size="md" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      ) : null}

      {/* ── THE COLLECTION ── */}
      <section className="pb-10 md:pb-12">
        <motion.div
          className="mb-6 md:mb-8"
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          variants={sectionReveal}
        >
          <SectionLabel
            eyebrow="Full Catalog"
            title="The Collection"
            count={`${collection.length} / ${initialCollection.totalCount}`}
          />
        </motion.div>
        <motion.div
          className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
          variants={containerStagger}
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
        >
          {collection.map((album) => (
            <motion.div key={album.id} variants={itemFadeUp}>
              <Link
                href={`/album/${album.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-transparent p-3 transition-all hover:border-white/[0.06] hover:bg-white/[0.04] md:flex-row md:gap-4 md:p-4"
              >
                {/* Mobile: square cover */}
                <div
                  className="aspect-square w-full overflow-hidden rounded-lg md:hidden"
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
                {/* Desktop: card with hover play */}
                <div className="hidden md:block">
                  <AlbumCard
                    album={album}
                    size="md"
                    showHoverPlay
                    onPlay={() => playFromAlbum(album)}
                  />
                </div>
                <div className="min-w-0 flex-1 md:pt-2">
                  <div className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#3DD6C8] md:text-[15px]">
                    {album.title}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#B3B3B3]">
                    {album.releaseDate?.slice(0, 4)} ·{" "}
                    {album.tracks.length}{" "}
                    {album.tracks.length === 1 ? "track" : "tracks"}
                  </div>
                  <p className="mt-2.5 hidden line-clamp-2 text-xs text-white/50 leading-relaxed md:block">
                    {album.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
        {hasMore ? (
          <div className="mt-8 flex justify-center">
            <motion.button
              onClick={loadMore}
              disabled={loading}
              className="rounded-full border border-white/15 px-8 py-2 text-sm font-semibold text-white/70 transition-all hover:border-[#3DD6C8]/40 hover:text-[#3DD6C8] disabled:opacity-50"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? "Loading…" : "Load More"}
            </motion.button>
          </div>
        ) : null}
      </section>

      {/* ── NOW PLAYING ── */}
      {currentTrack ? (
        <section className="pb-4">
          <div className="mb-5">
            <SectionLabel eyebrow="Active" title="Now Playing" />
          </div>
          <div
            className="flex items-center gap-5 rounded-2xl p-5"
            style={{
              background: currentAlbum
                ? `linear-gradient(135deg, ${currentAlbum.bgColor}aa 0%, #181818 100%)`
                : "#282828",
              border: "1px solid rgba(255,255,255,0.07)",
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
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#3DD6C8]">
                Currently Playing
              </div>
              <div className="truncate text-xl font-black leading-tight text-white md:text-2xl">
                {currentTrack.title}
              </div>
              <div className="mt-1 font-mono text-xs text-[#B3B3B3]">
                {PRIMARY_ARTIST}
                {currentTrack.features?.length
                  ? ` feat. ${currentTrack.features.join(", ")}`
                  : ""}
                {currentAlbum ? ` · ${currentAlbum.title}` : ""}
              </div>
              <motion.button
                onClick={togglePlayPause}
                className="mt-4 flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-bold text-black"
                style={{ background: currentAlbum?.accentColor ?? "#3DD6C8" }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                {isPlaying ? (
                  <>
                    <Pause size={13} fill="currentColor" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={13} fill="currentColor" />
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
