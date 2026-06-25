"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Music, Play, Shuffle, ShoppingBag } from "lucide-react";
import { getAlbumCover } from "@/lib/albumCover";
import { TrackRow } from "@/components/music/TrackRow";
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

const ALBUM_PRICE = 9.99;

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

  const handleBuyAlbum = () => {
    trackPurchaseIntent(null, album.id, `/album/${album.slug}`);
    openCheckout(albumCheckoutItem(album, ALBUM_PRICE));
  };

  const handleShuffle = () => {
    if (!shuffle) toggleShuffle();
    playFromAlbum(album);
  };

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
        <div className="flex-shrink-0 md:w-[360px] lg:w-[400px] px-6 pt-6 pb-6 md:px-8 md:pt-8 md:pb-8 flex flex-col gap-5 border-r border-white/[0.06]">
          {/* Album art */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full"
            style={{
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
              border: "1px solid rgba(255,255,255,0.06)",
              aspectRatio: "1 / 1",
              background: album.bgColor || "#1a2120",
            }}
          >
            {album.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getAlbumCover(album.coverImage, "lg")}
                alt={`${album.title} album cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={64} style={{ color: album.accentColor || "#62f3e4", opacity: 0.5 }} />
              </div>
            )}
          </motion.div>

          {/* Title + Meta */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 }}
            className="flex flex-col gap-2"
          >
            <h1 className="font-[family-name:var(--font-bungee)] text-3xl lg:text-4xl leading-tight text-[#62f3e4] tracking-tight">
              {album.title}
            </h1>
            <p className="text-sm font-medium text-[#dde4e2]">Jhodge</p>
            <p className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[#b3b3b3] uppercase tracking-wider">
              {[year, `${songCount} ${songCount === 1 ? "track" : "tracks"}`, totalDuration]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="flex items-center gap-3 flex-wrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.14 }}
          >
            <button
              onClick={() => playFromAlbum(album)}
              disabled={!album.tracks.length}
              aria-label={`Play ${album.title}`}
              className="flex h-12 w-12 items-center justify-center rounded-full disabled:opacity-40 flex-shrink-0"
              style={{ background: album.accentColor || "#62f3e4" }}
            >
              <Play size={20} fill="#003733" className="ml-0.5 text-[#003733]" />
            </button>
            <button
              onClick={handleShuffle}
              disabled={!album.tracks.length}
              aria-label="Shuffle play"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10 disabled:opacity-40 flex-shrink-0"
            >
              <Shuffle size={16} className={shuffle ? "text-[#62f3e4]" : ""} />
            </button>
            <button
              onClick={handleBuyAlbum}
              className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-[#003733] flex-shrink-0"
              style={{ background: "#ffabef" }}
            >
              <ShoppingBag size={16} />
              Buy · ${ALBUM_PRICE.toFixed(2)}
            </button>
          </motion.div>

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
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 text-[11px] text-white/70 hover:border-[#62f3e4] hover:text-[#62f3e4] transition-colors font-[family-name:var(--font-geist-mono)] uppercase tracking-wider"
                  >
                    {platform}
                  </a>
                )
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Tracklist ── */}
        <div className="flex-1 flex flex-col min-h-0 px-6 pt-6 pb-6 md:px-8 md:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
            className="mb-6"
          >
            <h2 className="font-[family-name:var(--font-bungee)] text-2xl text-[#dde4e2] tracking-tight">
              Tracklist
            </h2>
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
        <h2 className="mb-3 text-lg font-bold text-white">About this Album</h2>
        <p className="max-w-3xl text-sm text-white/80">{album.description}</p>
        {featuredArtists.length > 0 ? (
          <div className="mt-6">
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
        <div className="mt-6">
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
