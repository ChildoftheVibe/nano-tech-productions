"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Play, Shuffle, ShoppingBag } from "lucide-react";
import { AlbumCard } from "@/components/music/AlbumCard";
import { TrackRow } from "@/components/music/TrackRow";
import { usePlayerStore } from "@/store/playerStore";
import { useCheckoutStore, albumCheckoutItem } from "@/store/checkoutStore";
import {
  trackAlbumView,
  trackAlbumViewEnd,
  trackPurchaseIntent,
} from "@/lib/analytics";
import { usePageEngagement } from "@/lib/usePageEngagement";
import type { Album } from "@/types/music";

const ALBUM_PRICE = 9.99;

export function AlbumDetail({ album }: { album: Album }) {
  const playAlbum = usePlayerStore((s) => s.playAlbum);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const openCheckout = useCheckoutStore((s) => s.open);
  const [expanded, setExpanded] = useState(false);

  const year = album.releaseDate?.slice(0, 4) ?? "";
  const songCount = album.tracks.length;

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
    playAlbum(album);
  };

  const featuredArtists = Array.from(
    new Set(album.tracks.flatMap((t) => t.features ?? [])),
  );

  const platformLinks: Array<{ label: string; url?: string }> = [
    { label: "Spotify", url: album.spotifyUrl || undefined },
    { label: "Apple Music", url: album.appleMusicUrl },
    { label: "YouTube", url: album.youtubeUrl },
    { label: "Amazon", url: album.amazonUrl },
  ];

  return (
    <div className="text-white">
      <section
        className="px-6 pt-6 pb-8 md:px-8 md:pt-8 md:pb-10"
        style={{
          background: `linear-gradient(180deg, ${album.bgColor} 0%, #393838 100%)`,
        }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
          <AlbumCard album={album} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Album
            </div>
            <h1 className="mb-3 text-4xl font-extrabold leading-tight md:text-6xl">
              {album.title}
            </h1>
            <div className="mb-3 text-sm text-white/80">
              <span className="font-semibold text-white">Jhodge</span>
              {year ? ` · ${year}` : ""} · {songCount} {songCount === 1 ? "song" : "songs"}
            </div>
            <p
              className={`max-w-2xl text-sm text-white/80 ${
                expanded ? "" : "line-clamp-2"
              }`}
            >
              {album.description}
            </p>
            {album.description && album.description.length > 140 ? (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs font-semibold text-white/60 hover:text-white"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            ) : null}
            <p className="mt-3 text-xs text-white/60">
              © {year || new Date().getFullYear()} Nano Tech Productions. All
              rights reserved.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {platformLinks
                .filter((l) => !!l.url)
                .map((l) => (
                  <a
                    key={l.label}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-medium text-white hover:bg-black/40"
                  >
                    <ExternalLink size={12} />
                    {l.label}
                  </a>
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3 px-6 pb-6 md:px-8">
        <button
          onClick={() => playAlbum(album)}
          disabled={!album.tracks.length}
          aria-label={`Play ${album.title}`}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          style={{ background: album.accentColor || "#3DD6C8" }}
        >
          <Play size={22} fill="black" className="ml-1 text-black" />
        </button>
        <button
          onClick={handleShuffle}
          disabled={!album.tracks.length}
          aria-label="Shuffle play"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Shuffle size={18} className={shuffle ? "text-[#3DD6C8]" : ""} />
        </button>
        <button
          onClick={handleBuyAlbum}
          className="ml-2 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "#EB41DF" }}
        >
          <ShoppingBag size={16} />
          Buy Album · ${ALBUM_PRICE.toFixed(2)}
        </button>
      </section>

      <section className="px-2 pb-10 md:px-4">
        <div className="grid grid-cols-[40px_1fr_120px_80px_60px] gap-4 border-b border-white/10 px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#B3B3B3]">
          <div>#</div>
          <div>Title</div>
          <div>Price</div>
          <div></div>
          <div className="text-right">Time</div>
        </div>
        {album.tracks.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[#B3B3B3]">
            Track list coming soon.
          </div>
        ) : (
          <div className="pt-2">
            {album.tracks.map((track) => (
              <TrackRow key={track.id} track={track} album={album} />
            ))}
          </div>
        )}
      </section>

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
                <span
                  key={name}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white"
                >
                  {name}
                </span>
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
        {/* TODO: production notes & gear info — not in catalog.ts yet, add when data is available. */}
      </section>
    </div>
  );
}
