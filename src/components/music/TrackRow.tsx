"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlayer } from "@/context/PlayerContext";
import { MaybeArtistLinkList } from "@/components/artist/MaybeArtistLink";
import type { Album, Track } from "@/types/music";

type Props = {
  track: Track;
  album: Album;
  artistSlugsByName?: Record<string, string>;
};

const UNAVAILABLE_MESSAGE_MS = 2200;

export function TrackRow({ track, album, artistSlugsByName = {} }: Props) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const { togglePlayPause, playFromTrack } = usePlayer();

  const isActive = currentTrack?.id === track.id;
  const isThisPlaying = isActive && isPlaying;
  const accent = album.accentColor || "#62f3e4";

  const [showUnavailable, setShowUnavailable] = useState(false);
  useEffect(() => {
    if (!showUnavailable) return;
    const t = window.setTimeout(
      () => setShowUnavailable(false),
      UNAVAILABLE_MESSAGE_MS,
    );
    return () => window.clearTimeout(t);
  }, [showUnavailable]);

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

  return (
    <div
      className="group grid grid-cols-[40px_1fr_60px] items-center gap-3 px-3 py-3 transition-colors duration-150"
      style={{
        background: isActive ? `${accent}40` : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = "transparent";
        }
      }}
      aria-label={`Track ${track.trackNumber}: ${track.title}`}
    >
      {/* Number / EQ bars / Play icon */}
      <button
        onClick={handleClick}
        aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        className="flex h-6 w-6 items-center justify-center"
      >
        {isActive ? (
          isThisPlaying ? (
            /* Animated EQ bars */
            <span className="flex h-[14px] items-end gap-[2px]">
              <span
                className="eq-bar-1 block w-[3px] rounded-sm"
                style={{ height: "100%", background: accent, transformOrigin: "bottom" }}
              />
              <span
                className="eq-bar-2 block w-[3px] rounded-sm"
                style={{ height: "100%", background: accent, transformOrigin: "bottom" }}
              />
              <span
                className="eq-bar-3 block w-[3px] rounded-sm"
                style={{ height: "100%", background: accent, transformOrigin: "bottom" }}
              />
            </span>
          ) : (
            /* Paused bars (collapsed) */
            <span className="flex h-[14px] items-end gap-[2px]">
              <span className="block w-[3px] rounded-sm" style={{ height: "55%", background: accent, transform: "scaleY(0.5)", transformOrigin: "bottom" }} />
              <span className="block w-[3px] rounded-sm" style={{ height: "100%", background: accent, transform: "scaleY(0.5)", transformOrigin: "bottom" }} />
              <span className="block w-[3px] rounded-sm" style={{ height: "75%", background: accent, transform: "scaleY(0.5)", transformOrigin: "bottom" }} />
            </span>
          )
        ) : (
          <span className="relative flex h-5 w-5 items-center justify-center">
            {/* Track number — fades out on row hover */}
            <span
              className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-100"
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 12,
                color: "#6b7c79",
                lineHeight: 1,
              }}
            >
              {String(track.trackNumber).padStart(2, "0")}
            </span>
            {/* Play icon — fades in on row hover */}
            <Play
              size={14}
              fill="currentColor"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-100 text-white"
            />
          </span>
        )}
      </button>

      {/* Title + features */}
      <div className="min-w-0">
        <button
          onClick={handleClick}
          className="block w-full truncate text-left text-sm font-medium transition-none"
          style={{ color: isActive ? accent : "#dde4e2" }}
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
            style={{
              fontSize: 11,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#6b7c79",
            }}
          >
            Jhodge
            {track.features?.length ? (
              <>
                {" · feat "}
                <MaybeArtistLinkList
                  names={track.features}
                  slugsByName={artistSlugsByName}
                />
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Duration */}
      <div
        className="text-right text-xs"
        style={{
          fontFamily: "var(--font-geist-mono), monospace",
          color: isActive ? "#9db8b4" : "#6b7c79",
        }}
      >
        {track.duration}
      </div>
    </div>
  );
}
