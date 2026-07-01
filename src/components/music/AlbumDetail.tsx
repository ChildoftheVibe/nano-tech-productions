"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Play, Shuffle, ShoppingBag } from "lucide-react";
import { TrackRow } from "@/components/music/TrackRow";
import { AlbumCoverCarousel } from "@/components/music/AlbumCoverCarousel";
import { MaybeArtistLink, MaybeArtistLinkList } from "@/components/artist/MaybeArtistLink";
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

const COLLAPSED_LIMIT = 8;

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
  const totalCreditLines = creditTracks.reduce((n, g) => n + g.lines.length, 0);
  const hasAnyCredits = totalCreditLines > 0;
  const [showAllCredits, setShowAllCredits] = useState(false);

  const visibleCreditTracks = (() => {
    if (!hasAnyCredits) return [];
    if (showAllCredits || totalCreditLines <= COLLAPSED_LIMIT) return creditTracks;
    let remaining = COLLAPSED_LIMIT;
    const out: Array<{ track: typeof album.tracks[number]; lines: CreditLine[] }> = [];
    for (const g of creditTracks) {
      if (remaining <= 0) break;
      const take = g.lines.slice(0, remaining);
      out.push({ track: g.track, lines: take });
      remaining -= take.length;
    }
    return out;
  })();

  return (
    <div className="text-white min-h-full">
      {/* ── TWO-COLUMN LAYOUT ── */}
      <motion.div
        className="flex flex-col md:flex-row md:gap-0 md:min-h-[calc(100vh-80px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* ── LEFT: Art + Info ── */}
        <div
          className="flex-shrink-0 md:w-[360px] lg:w-[400px] flex flex-col gap-6"
          style={{ background: "#161d1c", padding: "32px 28px" }}
        >
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
            <p style={{ fontSize: 15, fontWeight: 500, color: "#ffffff", margin: 0 }}>
              Jhodge
            </p>
            <p
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                color: "#6b7c79",
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
                border: `1px solid ${shuffle ? accent : "rgba(255,255,255,0.22)"}`,
                color: shuffle ? accent : "rgba(255,255,255,0.80)",
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
                color: "#bbcac6",
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
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border hover:border-[#62f3e4] hover:text-[#62f3e4] transition-colors font-[family-name:var(--font-geist-mono)] uppercase tracking-wider"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      color: "#6b7c79",
                      fontSize: 10,
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
          style={{ background: "#090f0e", padding: "32px 32px 24px" }}
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
              borderBottom: "1px solid rgba(255,255,255,0.08)",
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
                color: "#6b7c79",
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
              <div className="py-10 text-center text-sm text-[#B3B3B3]">
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
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── CREDITS SECTION ── */}
      {hasAnyCredits ? (
        <section className="border-t border-white/5 px-6 py-8 md:px-8">
          <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-[0.25em] text-white">
            Production Credits
          </h2>
          <div className="space-y-5">
            {visibleCreditTracks.map(({ track, lines }) => (
              <div key={track.id}>
                <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#B3B3B3]">
                  {track.title}
                </h3>
                <ul className="space-y-0.5">
                  {lines.map((line) => (
                    <li key={`${track.id}-${line.label}`} className="text-xs text-[#B3B3B3]">
                      <span className="text-white/80">{line.label}:</span>{" "}
                      <MaybeArtistLinkList
                        names={line.names}
                        slugsByName={artistSlugsByName}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {totalCreditLines > COLLAPSED_LIMIT ? (
            <button
              type="button"
              onClick={() => setShowAllCredits((v) => !v)}
              className="mt-4 text-xs font-semibold text-[#62f3e4] hover:brightness-110"
            >
              {showAllCredits ? "Show fewer credits" : "Show all credits"}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="border-t border-white/5 px-6 py-8 md:px-8">
        {featuredArtists.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
              Featured Artists
            </h3>
            <div className="flex flex-wrap gap-2">
              {featuredArtists.map((name) => (
                <MaybeArtistLink
                  key={name}
                  name={name}
                  slugsByName={artistSlugsByName}
                  className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white"
                />
              ))}
            </div>
          </div>
        ) : null}
        <div className={featuredArtists.length > 0 ? "mt-6" : ""}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
            Credits
          </h3>
          <p className="text-xs text-white/60">
            {album.copyright ?? "© Nano Tech Productions. All rights reserved."}
          </p>
        </div>
      </section>
    </div>
  );
}
