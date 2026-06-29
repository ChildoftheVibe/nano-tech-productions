"use client";

import { useEffect, useRef, useState } from "react";
import { Play, MoreVertical, ListPlus, ShoppingCart, Share2, Info } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlayer } from "@/context/PlayerContext";
import { useCheckoutStore, trackCheckoutItem } from "@/store/checkoutStore";
import { MaybeArtistLinkList } from "@/components/artist/MaybeArtistLink";
import type { Album, Track, TrackCredits } from "@/types/music";

const CREDIT_LABELS: Array<{ key: keyof TrackCredits; label: string }> = [
  { key: "produced_by", label: "Produced by" },
  { key: "written_by", label: "Written by" },
  { key: "arranged_by", label: "Arranged by" },
  { key: "lead_vocals", label: "Lead Vocals" },
  { key: "background_vocals", label: "Background Vocals" },
  { key: "drums", label: "Drums" },
  { key: "percussion", label: "Percussion" },
  { key: "mixing_engineer", label: "Mixing" },
  { key: "mastering_engineer", label: "Mastering" },
  { key: "artwork", label: "Artwork" },
  { key: "lyrics", label: "Lyrics by" },
];

type Props = {
  track: Track;
  album: Album;
  artistSlugsByName?: Record<string, string>;
};

const UNAVAILABLE_MESSAGE_MS = 2200;

export function TrackRow({ track, album, artistSlugsByName = {} }: Props) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const { togglePlayPause, playFromTrack } = usePlayer();
  const openCheckout = useCheckoutStore((s) => s.open);

  const isActive = currentTrack?.id === track.id;
  const isThisPlaying = isActive && isPlaying;
  const accent = album.accentColor || "#62f3e4";

  const [showUnavailable, setShowUnavailable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUnavailable) return;
    const t = window.setTimeout(() => setShowUnavailable(false), UNAVAILABLE_MESSAGE_MS);
    return () => window.clearTimeout(t);
  }, [showUnavailable]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen]);

  const handleClick = () => {
    if (isActive) {
      togglePlayPause();
      return;
    }
    if (!track.audioUrl) {
      setShowUnavailable(true);
      return;
    }
    playFromTrack(track, album);
    void fetch("/api/tracks/played", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: track.id }),
      keepalive: true,
    }).catch(() => {});
  };

  const handleAddToQueue = () => {
    setMenuOpen(false);
    addToQueue(track);
  };

  const handleBuy = () => {
    setMenuOpen(false);
    openCheckout(trackCheckoutItem(track, album));
  };

  const handleShare = async () => {
    setMenuOpen(false);
    const url = `${window.location.origin}/album/${album.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // user cancelled or clipboard denied
    }
  };

  const handleCredits = () => {
    setMenuOpen(false);
    setCreditsOpen(true);
  };

  const creditLines = CREDIT_LABELS.flatMap(({ key, label }) => {
    const arr = track.credits?.[key];
    if (!Array.isArray(arr) || arr.length === 0) return [];
    return [{ label, names: arr.filter((s): s is string => typeof s === "string") }];
  });

  return (
    <>
      <div
        className="group grid grid-cols-[40px_1fr_60px_32px] items-center gap-2 px-3 py-4 transition-colors duration-150"
        style={{ background: isActive ? `${accent}66` : "transparent" }}
        onMouseEnter={(e) => {
          if (!isActive)
            (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          if (!isActive)
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }}
        aria-label={`Track ${track.trackNumber}: ${track.title}`}
      >
        {/* Number / EQ bars / Play icon */}
        <button
          onClick={handleClick}
          aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className="flex h-6 w-6 items-center justify-center"
          style={{ boxShadow: "none" }}
        >
          {isActive ? (
            isThisPlaying ? (
              <span className="flex h-[14px] items-end gap-[2px]">
                <span className="eq-bar-1 block w-[3px] rounded-sm" style={{ height: "100%", background: accent, transformOrigin: "bottom" }} />
                <span className="eq-bar-2 block w-[3px] rounded-sm" style={{ height: "100%", background: accent, transformOrigin: "bottom" }} />
                <span className="eq-bar-3 block w-[3px] rounded-sm" style={{ height: "100%", background: accent, transformOrigin: "bottom" }} />
              </span>
            ) : (
              <span className="flex h-[14px] items-end gap-[2px]">
                <span className="block w-[3px] rounded-sm" style={{ height: "55%", background: accent, transform: "scaleY(0.5)", transformOrigin: "bottom" }} />
                <span className="block w-[3px] rounded-sm" style={{ height: "100%", background: accent, transform: "scaleY(0.5)", transformOrigin: "bottom" }} />
                <span className="block w-[3px] rounded-sm" style={{ height: "75%", background: accent, transform: "scaleY(0.5)", transformOrigin: "bottom" }} />
              </span>
            )
          ) : (
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span
                className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-100"
                style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, color: "#6b7c79", lineHeight: 1 }}
              >
                {String(track.trackNumber).padStart(2, "0")}
              </span>
              <Play size={14} fill="currentColor" className="opacity-0 group-hover:opacity-100 transition-opacity duration-100 text-white" />
            </span>
          )}
        </button>

        {/* Title + features */}
        <div className="min-w-0">
          <button
            onClick={handleClick}
            className="block w-full truncate text-left font-medium transition-none"
            style={{ fontSize: 15, color: isActive ? accent : "#dde4e2", boxShadow: "none" }}
          >
            {track.title}
          </button>
          {showUnavailable ? (
            <div className="truncate text-xs text-yellow-300/90" role="status" aria-live="polite">
              Audio not yet available
            </div>
          ) : (
            <div
              className="truncate"
              style={{ fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: "#6b7c79" }}
            >
              Jhodge
              {track.features?.length ? (
                <>
                  {" · feat "}
                  <MaybeArtistLinkList names={track.features} slugsByName={artistSlugsByName} />
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Duration */}
        <div
          className="text-right text-xs"
          style={{ fontFamily: "var(--font-geist-mono), monospace", color: isActive ? "#9db8b4" : "#6b7c79" }}
        >
          {track.duration}
        </div>

        {/* Three-dots menu — always visible on mobile, hover-only on desktop */}
        <div ref={menuRef} className="relative flex items-center justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            aria-label="Track options"
            aria-expanded={menuOpen}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100"
            style={{ color: isActive ? accent : "#6b7c79", boxShadow: "none" }}
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-50 min-w-[188px] rounded-xl border py-1.5 shadow-2xl"
              style={{ background: "#1a2120", borderColor: "rgba(255,255,255,0.10)" }}
            >
              <button
                onClick={handleAddToQueue}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                style={{ color: "#dde4e2", boxShadow: "none" }}
              >
                <ListPlus size={15} style={{ color: accent, flexShrink: 0 }} />
                Add to Queue
              </button>
              <button
                onClick={handleBuy}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                style={{ color: "#dde4e2", boxShadow: "none" }}
              >
                <ShoppingCart size={15} style={{ color: accent, flexShrink: 0 }} />
                Buy · ${track.price.toFixed(2)}
              </button>
              <button
                onClick={handleShare}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                style={{ color: "#dde4e2", boxShadow: "none" }}
              >
                <Share2 size={15} style={{ color: accent, flexShrink: 0 }} />
                Share Track
              </button>
              <button
                onClick={handleCredits}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                style={{ color: "#dde4e2", boxShadow: "none" }}
              >
                <Info size={15} style={{ color: accent, flexShrink: 0 }} />
                View Credits
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Credits sheet */}
      {creditsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={() => setCreditsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#1a2120", border: "1px solid rgba(255,255,255,0.10)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="mb-1 text-[10px] uppercase tracking-[0.18em]"
              style={{ fontFamily: "var(--font-geist-mono), monospace", color: "#6b7c79" }}
            >
              Credits
            </p>
            <h3
              className="mb-4 text-base font-semibold"
              style={{ color: accent }}
            >
              {track.title}
            </h3>
            {creditLines.length > 0 ? (
              <ul className="space-y-2">
                {creditLines.map((line) => (
                  <li key={line.label} className="text-sm">
                    <span style={{ color: "#6b7c79" }}>{line.label}: </span>
                    <span style={{ color: "#dde4e2" }}>{line.names.join(", ")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: "#6b7c79" }}>No credits available for this track.</p>
            )}
            <button
              onClick={() => setCreditsOpen(false)}
              className="mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", color: "#dde4e2", boxShadow: "none" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
