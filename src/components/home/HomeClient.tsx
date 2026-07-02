"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { AlbumCard } from "@/components/music/AlbumCard";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { usePlayerStore } from "@/store/playerStore";
import { usePlayer } from "@/context/PlayerContext";
import { usePageEngagement } from "@/lib/usePageEngagement";
import type { Album, AlbumListResult, Artist, Track } from "@/types/music";
import type { HeroMedia } from "@/lib/queries";
import { getHeroImage } from "@/lib/albumCover";

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
  weeklyTracks: Track[];
  heroMedia?: HeroMedia[] | null;
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
      <div className="mb-2 h-px w-6 bg-[#62f3e4]" />
      <div className="flex items-baseline gap-3">
        <h2 className="font-[family-name:var(--font-bungee)] text-[24px] leading-tight text-[#dde4e2] tracking-tight">{title}</h2>
        {count && (
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[#B3B3B3]">{count}</span>
        )}
      </div>
      <div className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.28em] text-[#62f3e4]/70">
        {eyebrow}
      </div>
    </div>
  );
}

export function HomeClient({
  featured,
  latest,
  initialCollection,
  featuredArtists,
  weeklyTracks,
  heroMedia,
}: Props) {
  const greeting = useSyncExternalStore(
    subscribeNoop,
    getClientGreeting,
    getServerGreeting,
  );

  usePageEngagement("/");

  const { playFromAlbum, playAlbumBySlug, togglePlayPause } = usePlayer();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [collection, setCollection] = useState<Album[]>(
    initialCollection.albums,
  );
  const [hasMore, setHasMore] = useState(initialCollection.hasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Hydration flag without setState-in-effect: false on server, true after hydration
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  // ── Hero carousel ──────────────────────────────────────────────────────────
  const slides = heroMedia && heroMedia.length > 0 ? heroMedia : null;
  const [slideIdx, setSlideIdx] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const goTo = useCallback(
    (idx: number) => {
      if (!slides) return;
      setSlideIdx((idx + slides.length) % slides.length);
    },
    [slides],
  );

  // Auto-advance every 6 s, pause on hover or when only 1 slide.
  useEffect(() => {
    if (!slides || slides.length <= 1 || heroPaused) return;
    const t = setInterval(() => goTo(slideIdx + 1), 6000);
    return () => clearInterval(t);
  }, [slides, slideIdx, heroPaused, goTo]);

  // Restart the active video whenever the slide changes.
  useEffect(() => {
    const vid = videoRefs.current[slideIdx];
    if (vid) { vid.currentTime = 0; void vid.play(); }
  }, [slideIdx]);

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
        {latest ? (
          <div
            className="relative h-[360px] md:h-[450px] overflow-hidden rounded-xl group cursor-pointer"
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
          >
            {/* Background: carousel of admin hero media, or fallback gradient + logo */}
            {slides ? (
              slides.map((media, idx) =>
                media.mediaType === "video" ? (
                  <video
                    key={media.id}
                    ref={(el) => { videoRefs.current[idx] = el; }}
                    src={media.url}
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
                    style={{ opacity: idx === slideIdx ? 1 : 0 }}
                    autoPlay={idx === slideIdx}
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  // Ken Burns zoom animates this wrapper, not the <img> itself — animating a
                  // transform directly on an object-fit: cover element fails to paint on some
                  // mobile Safari versions (the image goes blank). The wrapper absorbs the
                  // transform; the image stays a static, always-painted fill layer.
                  <div
                    key={media.id}
                    className={`absolute inset-0 overflow-hidden transition-opacity duration-1000${idx === slideIdx ? " animate-kenburns" : ""}`}
                    style={{ opacity: idx === slideIdx ? 1 : 0 }}
                  >
                    {/* Width-only Cloudinary resize via getHeroImage() — the square-crop
                        getAlbumCover() would butcher the wide hero art, and the raw
                        original is a multi-MB PNG that stalls cellular connections. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getHeroImage(media.url, 1600)}
                      srcSet={[800, 1200, 1600, 2400]
                        .map((w) => `${getHeroImage(media.url, w)} ${w}w`)
                        .join(", ")}
                      sizes="100vw"
                      fetchPriority={idx === 0 ? "high" : undefined}
                      decoding="async"
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ),
              )
            ) : (
              <>
                {/* Accent gradient background */}
                <div
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${latest.accentColor} 0%, #121212 100%)`,
                  }}
                />
                {/* Nano Tech logo — shown only when no hero media is configured */}
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  {/* Static brand asset in /public — not an album cover, so no getAlbumCover() */}
                  <img
                    src="/assets/ntp-logo.svg"
                    alt="Nano Tech"
                    className="h-40 w-40 md:h-56 md:w-56 object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </>
            )}
            {/* Scrim */}
            <div className="absolute inset-0 bg-[#121212]/30 z-10 pointer-events-none" />
            {/* Cinematic letterbox: top + bottom gradients */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-[#121212]/90 via-[#121212]/30 to-transparent z-10 pointer-events-none" />
            {/* Edge vignette + film grain */}
            <div className="absolute inset-0 z-10 cinematic-vignette" />
            <div className="absolute inset-0 z-10 film-grain" />

            {/* Prev / Next arrows — only when >1 slide */}
            {slides && slides.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); goTo(slideIdx - 1); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 rounded-full bg-black/40 p-2 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goTo(slideIdx + 1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 rounded-full bg-black/40 p-2 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                  aria-label="Next slide"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-4 right-4 z-30 flex gap-1.5">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); goTo(idx); }}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === slideIdx
                          ? "w-5 bg-[#62f3e4]"
                          : "w-1.5 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 max-w-2xl">
              <div className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.3em] text-[#ffabef] mb-3">
                New Release
              </div>
              <h1 className="font-[family-name:var(--font-bungee)] text-4xl md:text-6xl text-white leading-none mb-3 tracking-tight">
                {latest.title}
              </h1>
              {latest.description && (
                <p className="text-sm text-[#dde4e2]/70 max-w-md mb-6 line-clamp-2">
                  {latest.description}
                </p>
              )}
              <div className="flex gap-3 flex-wrap">
                <motion.button
                  onClick={() => playFromAlbum(latest)}
                  disabled={!latest.tracks.length}
                  className="bg-[#62f3e4] text-[#003733] px-8 py-3 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-40 teal-glow"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Play size={14} fill="currentColor" />
                  Listen Now
                </motion.button>
                <Link
                  href={`/album/${latest.slug}`}
                  className="glass-panel px-8 py-3 rounded-lg font-bold text-sm text-[#dde4e2] hover:bg-white/10 transition-colors"
                >
                  View Album
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#62f3e4]">
              Nano Tech Vibe · The Vault
            </div>
            <h1 className="font-[family-name:var(--font-bungee)] text-4xl leading-[0.93] text-white md:text-6xl lg:text-7xl">
              {greeting}
              <span className="text-[#62f3e4]">.</span>
            </h1>
            <p className="mt-4 max-w-xs text-sm text-[#B3B3B3] leading-relaxed md:max-w-sm">
              Music direct from the artist. No algorithm. No filter.
            </p>
          </>
        )}
      </motion.section>

      {/* ── FEATURED ── */}
      <section className="pb-12 md:pb-16">
        <motion.div
          className="mb-6 md:mb-8 flex items-end justify-between"
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          variants={sectionReveal}
        >
          <SectionLabel eyebrow="Curated" title="Featured" />
          <Link
            href="/library"
            className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-widest text-[#62f3e4] hover:underline transition-colors flex-shrink-0"
          >
            View All
          </Link>
        </motion.div>
        {featured.length === 0 ? (
          <div className="rounded-md border border-white/10 p-6 text-sm text-[#B3B3B3]">
            No albums yet. Run the seed script to populate the catalog.
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6"
            variants={containerStagger}
            initial="hidden"
            animate={mounted ? "visible" : "hidden"}
          >
            {featured.map((album, idx) => (
              <motion.div
                key={album.id}
                variants={itemFadeUp}
              >
                <AlbumCard
                  album={album}
                  size="md"
                  href={`/album/${album.slug}`}
                  showHoverPlay
                  onPlay={() => void playAlbumBySlug(album.slug)}
                  priority={idx < 6}
                  fetchPriority={idx < 3 ? "high" : undefined}
                />
                <div className="mt-2.5 space-y-1">
                  <div className="truncate text-sm font-semibold text-[#dde4e2] leading-tight">
                    <Link
                      href={`/album/${album.slug}`}
                      className="hover:text-[#62f3e4] transition-colors duration-200"
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
        )}
      </section>


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
          className="mb-6 md:mb-8 flex items-end justify-between"
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          variants={sectionReveal}
        >
          <SectionLabel
            eyebrow="Full Catalog"
            title="The Collection"
            count={`${collection.length} / ${initialCollection.totalCount}`}
          />
          <Link
            href="/library"
            className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-widest text-[#62f3e4] hover:underline transition-colors flex-shrink-0"
          >
            View All
          </Link>
        </motion.div>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          variants={containerStagger}
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
        >
          {collection.map((album) => (
            <motion.div key={album.id} variants={itemFadeUp}>
              <AlbumCard
                album={album}
                size="md"
                href={`/album/${album.slug}`}
                showHoverPlay
                onPlay={() => void playAlbumBySlug(album.slug)}
              />
              <div className="mt-2.5 space-y-1">
                <div className="truncate text-sm font-semibold text-[#dde4e2] leading-tight">
                  <Link
                    href={`/album/${album.slug}`}
                    className="hover:text-[#62f3e4] transition-colors duration-200"
                  >
                    {album.title}
                  </Link>
                </div>
                <div className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-wider text-[#b3b3b3]">
                  {album.releaseDate?.slice(0, 4)}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        {hasMore ? (
          <div className="mt-8 flex justify-center">
            <motion.button
              onClick={loadMore}
              disabled={loading}
              className="rounded-full border border-white/15 px-8 py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-[#62f3e4]/40 hover:text-[#62f3e4] disabled:opacity-50"
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
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#62f3e4]">
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
                className="mt-4 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-[#121212]"
                style={{ background: currentAlbum?.accentColor ?? "#62f3e4" }}
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
