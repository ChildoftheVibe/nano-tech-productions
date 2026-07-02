"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Play, Shuffle, ShoppingBag, BookOpen, X, Images } from "lucide-react";
import { TrackRow } from "@/components/music/TrackRow";
import { AlbumCoverCarousel } from "@/components/music/AlbumCoverCarousel";
import { MaybeArtistLink, MaybeArtistLinkList } from "@/components/artist/MaybeArtistLink";
import { AlbumMediaGallery, type GalleryItem } from "@/components/music/AlbumMediaGallery";
import { getAlbumCover } from "@/lib/albumCover";
import { getAlbumTheme } from "@/lib/albumTheme";
import { usePlayerStore } from "@/store/playerStore";
import { usePlayer } from "@/context/PlayerContext";
import { useCheckoutStore, albumCheckoutItem } from "@/store/checkoutStore";
import {
  trackAlbumView,
  trackAlbumViewEnd,
  trackPurchaseIntent,
} from "@/lib/analytics";
import { usePageEngagement } from "@/lib/usePageEngagement";
import type { Album, Track, TrackCredits } from "@/types/music";

const DEFAULT_ALBUM_PRICE = 9.99;

const CREDIT_ROLE_LABELS: Array<{ key: keyof TrackCredits; label: string }> = [
  { key: "produced_by", label: "Produced by" },
  { key: "arranged_by", label: "Arranged by" },
  { key: "written_by", label: "Written by" },
  { key: "lead_vocals", label: "Lead Vocals" },
  { key: "background_vocals", label: "Background Vocals" },
  { key: "drums", label: "Drums" },
  { key: "percussion", label: "Percussion" },
  { key: "mixing_engineer", label: "Mixing Engineer" },
  { key: "mastering_engineer", label: "Mastering Engineer" },
  { key: "artwork", label: "Artwork" },
  { key: "lyrics", label: "Lyrics by" },
];

type CreditLine = { label: string; names: string[] };

function buildCreditEntries(credits: TrackCredits | null | undefined): CreditLine[] {
  if (!credits) return [];
  const out: CreditLine[] = [];
  for (const { key, label } of CREDIT_ROLE_LABELS) {
    const arr = credits[key];
    if (Array.isArray(arr) && arr.length > 0) {
      out.push({ label, names: arr.filter((s): s is string => typeof s === "string") });
    }
  }
  return out;
}

function calcTotalDuration(tracks: Track[]): string {
  let totalSecs = 0;
  for (const t of tracks) {
    if (!t.duration) continue;
    const parts = t.duration.split(":").map(Number);
    if (parts.length === 2) totalSecs += (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    else if (parts.length === 1) totalSecs += parts[0] ?? 0;
  }
  const mins = Math.floor(totalSecs / 60);
  return mins > 0 ? `${mins} min` : `${totalSecs} sec`;
}

const trackContainer: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const trackItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

type AlbumDetailProps = {
  album: Album;
  artistSlugsByName?: Record<string, string>;
};

export function AlbumDetail({
  album,
  artistSlugsByName = {},
}: AlbumDetailProps) {
  const { playFromAlbum } = usePlayer();
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const openCheckout = useCheckoutStore((s) => s.open);

  const accent = album.accentColor || "#62f3e4";
  const theme = getAlbumTheme(album.lightMode);
  const year = album.releaseDate?.slice(0, 4) ?? "";
  const songCount = album.tracks.length;
  const totalDuration = calcTotalDuration(album.tracks);

  useEffect(() => {
    trackAlbumView(album);
  }, [album]);

  const onUnmount = useCallback(
    (ms: number) => trackAlbumViewEnd(album.id, ms),
    [album.id],
  );
  usePageEngagement(`/album/${album.slug}`, onUnmount);

  const albumPrice = album.price ?? DEFAULT_ALBUM_PRICE;

  const handleBuyAlbum = () => {
    trackPurchaseIntent(null, album.id, `/album/${album.slug}`);
    openCheckout(albumCheckoutItem(album, albumPrice));
  };

  const handlePlay = () => {
    if (shuffle) toggleShuffle();
    playFromAlbum(album);
  };

  const handleShuffle = () => {
    if (!shuffle) toggleShuffle();
    playFromAlbum(album);
  };

  const typeLabel =
    album.album_type === "single"
      ? "Single"
      : album.album_type === "ep"
        ? "EP"
        : "Full Album";

  const featuredArtists = Array.from(
    new Set(album.tracks.flatMap((t) => t.features ?? [])),
  );

  const creditTracks = album.tracks
    .map((t) => ({ track: t, lines: buildCreditEntries(t.credits) }))
    .filter((g) => g.lines.length > 0);
  const hasAnyCredits = creditTracks.length > 0;
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  async function openGallery() {
    if (!galleryLoaded) {
      try {
        const res = await fetch(`/api/albums/${album.slug}/media`);
        if (res.ok) {
          const json = (await res.json()) as { media: GalleryItem[] };
          setGalleryItems(json.media ?? []);
        }
      } catch {
        // silently fall through — gallery opens empty rather than blocking
      }
      setGalleryLoaded(true);
    }
    setGalleryOpen(true);
  }

  return (
    <div
      className="min-h-full"
      style={{
        color: theme.textPrimary,
        // Exposed for className-based hover states in TrackRow menus and modal
        // buttons so they resolve to the active theme.
        "--album-hover": theme.hoverBg,
        "--album-hover-strong": theme.hoverBgStrong,
      } as React.CSSProperties}
    >
      {/* ── TWO-COLUMN LAYOUT ── */}
      <motion.div
        className="flex flex-col md:flex-row md:gap-0 md:min-h-[calc(100vh-80px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* ── LEFT: Art + Info ── */}
        <div
          className="flex-shrink-0 md:w-[360px] lg:w-[400px] flex flex-col gap-6 relative overflow-hidden isolate"
          style={{ background: theme.panelBg, padding: "32px 28px" }}
        >
          {/* Ambient stage backdrop: blurred cover art + scrim, sits behind content */}
          {album.coverImage && (
            <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAlbumCover(album.coverImage, "md")}
                alt=""
                className="h-full w-full object-cover opacity-25"
                style={{ filter: "blur(60px)", transform: "scale(1.3)" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, rgba(${theme.scrimRgb},0.6) 0%, rgba(${theme.scrimRgb},0.85) 60%, rgba(${theme.scrimRgb},0.95) 100%)`,
                }}
              />
              <div className="absolute inset-0 film-grain" />
            </div>
          )}
          {/* Album art — static cover + up to 4 looping cover videos */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full"
          >
            <AlbumCoverCarousel
              coverImage={album.coverImage}
              coverVideos={album.coverVideos}
              accent={accent}
              bgColor={album.bgColor}
              title={album.title}
              size="lg"
              onPlay={album.tracks.length ? handlePlay : undefined}
            />
          </motion.div>

          {/* Title + Meta */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <span
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                color: accent,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {typeLabel}
            </span>
            <h1
              className="font-[family-name:var(--font-bungee)] leading-[1.05] tracking-tight"
              style={{ fontSize: "2.25rem", color: accent, margin: 0 }}
            >
              {album.title}
            </h1>
            <p style={{ fontSize: 15, fontWeight: 500, color: theme.textStrong, margin: 0 }}>
              Jhodge
            </p>
            <p
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                margin: 0,
              }}
            >
              {[year, `${songCount} ${songCount === 1 ? "TRACK" : "TRACKS"}`, totalDuration]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </motion.div>

          {/* Action buttons — Shuffle circle + Buy pill (mirrors reference layout) */}
          <motion.div
            style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.14 }}
          >
            {/* Play — filled accent pill (primary CTA, matches album accent) */}
            <button
              onClick={handlePlay}
              disabled={!album.tracks.length}
              aria-label="Play album"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 8,
                padding: "12px 22px",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: accent,
                color: "#003733",
                cursor: "pointer",
                flexShrink: 0,
                border: "none",
                opacity: album.tracks.length ? 1 : 0.4,
                boxShadow: `0 0 20px ${accent}4d`,
              }}
            >
              <Play size={14} fill="#003733" />
              Play
            </button>

            {/* Shuffle — outline rounded-rect pill */}
            <button
              onClick={handleShuffle}
              disabled={!album.tracks.length}
              aria-label="Shuffle play"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 8,
                padding: "12px 20px",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
                opacity: album.tracks.length ? 1 : 0.4,
                border: `1px solid ${shuffle ? accent : theme.borderStrong}`,
                color: shuffle ? accent : theme.textSecondary,
              }}
            >
              <Shuffle size={14} />
              Shuffle
            </button>

            {/* Buy — outline rounded-rect pill, tinted to album accent */}
            <button
              onClick={handleBuyAlbum}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 8,
                padding: "12px 20px",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
                border: `1px solid ${accent}`,
                color: accent,
              }}
            >
              <ShoppingBag size={14} />
              Buy · ${albumPrice.toFixed(2)}
            </button>

            {/* Credits — only shown when credits exist */}
            {hasAnyCredits && (
              <button
                onClick={() => setCreditsModalOpen(true)}
                aria-label="View production credits"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 8,
                  padding: "12px 20px",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  border: `1px solid ${theme.borderStrong}`,
                  color: theme.textSecondary,
                }}
              >
                <BookOpen size={14} />
                Credits
              </button>
            )}

            {/* Media gallery button */}
            <button
              onClick={() => void openGallery()}
              aria-label="View album media gallery"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 8,
                padding: "12px 20px",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
                border: `1px solid ${theme.borderStrong}`,
                color: theme.textSecondary,
              }}
            >
              <Images size={14} />
              Media
            </button>
          </motion.div>

          {/* Description */}
          {album.description?.trim() ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.18 }}
              style={{
                fontSize: 13,
                lineHeight: 1.65,
                color: theme.textSecondary,
                margin: 0,
              }}
            >
              {album.description}
            </motion.p>
          ) : null}

          {/* Streaming links */}
          {album.streaming_links != null &&
           typeof album.streaming_links === "object" &&
           !Array.isArray(album.streaming_links) &&
           Object.keys(album.streaming_links).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {(Object.entries(album.streaming_links as Record<string, string>)).map(
                ([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors font-[family-name:var(--font-geist-mono)] uppercase tracking-wider"
                    style={{
                      borderColor: theme.border,
                      color: theme.textMuted,
                      fontSize: 10,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = accent;
                      e.currentTarget.style.color = accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.color = theme.textMuted;
                    }}
                  >
                    {platform}
                  </a>
                )
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Tracklist ── */}
        <div
          className="flex-1 flex flex-col min-h-0"
          style={{ background: theme.trackBg, padding: "32px 32px 24px" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingBottom: 14,
              marginBottom: 12,
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <h2
              className="font-[family-name:var(--font-bungee)] tracking-tight"
              style={{
                fontSize: 22,
                color: accent,
                margin: 0,
              }}
            >
              Tracklist
            </h2>
            <span
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                cursor: "default",
              }}
            >
              Duration
            </span>
          </motion.div>

          {/* Track rows */}
          <div className="flex-1 overflow-y-auto">
            {album.tracks.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: theme.textMuted }}>
                Track list coming soon.
              </div>
            ) : (
              <motion.div
                variants={trackContainer}
                initial="hidden"
                animate="visible"
              >
                {album.tracks.map((track) => (
                  <motion.div key={track.id} variants={trackItem}>
                    <TrackRow
                      track={track}
                      album={album}
                      artistSlugsByName={artistSlugsByName}
                      theme={theme}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── CREDITS MODAL ── */}
      <AnimatePresence>
        {creditsModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="credits-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setCreditsModalOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.72)",
                zIndex: 50,
                backdropFilter: "blur(4px)",
              }}
            />
            {/* Panel */}
            <motion.div
              key="credits-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Production Credits"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 51,
                width: "min(560px, calc(100vw - 32px))",
                maxHeight: "min(680px, calc(100vh - 80px))",
                display: "flex",
                flexDirection: "column",
                borderRadius: 16,
                background: theme.panelBg,
                border: `1px solid ${accent}26`,
                boxShadow: `0 0 60px ${accent}22, 0 24px 64px rgba(0,0,0,0.6)`,
                overflow: "hidden",
              }}
            >
              {/* Modal header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 24px 16px",
                  borderBottom: `1px solid ${accent}20`,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono), monospace",
                      fontSize: 10,
                      color: accent,
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      fontWeight: 600,
                    }}
                  >
                    Production Credits
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary }}>
                    {album.title}
                  </span>
                </div>
                <button
                  onClick={() => setCreditsModalOpen(false)}
                  aria-label="Close credits"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: theme.hoverBgStrong,
                    border: `1px solid ${theme.borderStrong}`,
                    color: theme.textSecondary,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable content */}
              <div
                className="no-scrollbar"
                style={{ overflowY: "auto", padding: "20px 24px 28px", flex: 1 }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {creditTracks.map(({ track, lines }) => (
                    <div key={track.id}>
                      <p
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.2em",
                          color: accent,
                          marginBottom: 10,
                        }}
                      >
                        {track.title}
                      </p>
                      <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {lines.map((line) => (
                          <li
                            key={`${track.id}-${line.label}`}
                            style={{
                              display: "flex",
                              gap: 8,
                              fontSize: 13,
                              alignItems: "baseline",
                            }}
                          >
                            <span
                              style={{
                                color: theme.textMuted,
                                whiteSpace: "nowrap",
                                minWidth: 140,
                                fontFamily: "var(--font-geist-mono), monospace",
                                fontSize: 11,
                              }}
                            >
                              {line.label}
                            </span>
                            <span style={{ color: theme.textPrimary }}>
                              <MaybeArtistLinkList
                                names={line.names}
                                slugsByName={artistSlugsByName}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer accent bar */}
              <div
                style={{
                  height: 3,
                  background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)`,
                  flexShrink: 0,
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MEDIA GALLERY MODAL ── */}
      <AlbumMediaGallery
        items={galleryItems}
        accent={accent}
        albumTitle={album.title}
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      <section
        className="px-6 py-8 md:px-8"
        style={{ background: theme.trackBg, borderTop: `1px solid ${theme.border}` }}
      >
        {featuredArtists.length > 0 ? (
          <div>
            <h3
              className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: theme.textMuted }}
            >
              Featured Artists
            </h3>
            <div className="flex flex-wrap gap-2">
              {featuredArtists.map((name) => (
                <MaybeArtistLink
                  key={name}
                  name={name}
                  slugsByName={artistSlugsByName}
                  className="rounded-full border px-4 py-1.5 text-xs"
                  style={{ borderColor: theme.borderStrong, color: theme.textPrimary }}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div className={featuredArtists.length > 0 ? "mt-6" : ""}>
          <h3
            className="mb-2 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: theme.textMuted }}
          >
            Credits
          </h3>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            {album.copyright ?? "© Nano Tech Productions. All rights reserved."}
          </p>
        </div>
      </section>
    </div>
  );
}
