"use client";

import { Play } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useCheckoutStore, trackCheckoutItem } from "@/store/checkoutStore";
import { MaybeArtistLinkList } from "@/components/artist/MaybeArtistLink";
import type { Album, Track } from "@/types/music";

type Props = {
  track: Track;
  album: Album;
  artistSlugsByName?: Record<string, string>;
};

export function TrackRow({ track, album, artistSlugsByName = {} }: Props) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const isActive = currentTrack?.id === track.id;
  const isThisPlaying = isActive && isPlaying;

  const handleClick = () => {
    if (isActive) {
      togglePlay();
    } else {
      playTrack(track, album);
      void fetch("/api/tracks/played", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id }),
        keepalive: true,
      }).catch(() => {});
    }
  };

  const openCheckout = useCheckoutStore((s) => s.open);
  const handleBuy = () => {
    openCheckout(trackCheckoutItem(track, album));
  };

  return (
    <div
      className={`group grid grid-cols-[40px_1fr_60px] items-center gap-3 rounded-md px-3 py-2 transition-colors duration-150 hover:bg-white/[0.04] md:grid-cols-[40px_1fr_120px_80px_60px] md:gap-4 md:px-4 ${
        isActive ? "bg-white/[0.04]" : ""
      }`}
    >
      <button
        onClick={handleClick}
        aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        className="flex h-6 w-6 items-center justify-center text-sm"
      >
        {isActive ? (
          isThisPlaying ? (
            <span className="flex h-4 items-end gap-0.5">
              <span
                className="eq-bar-1 block w-1 rounded-sm"
                style={{
                  height: "100%",
                  background: "#3DD6C8",
                  transformOrigin: "bottom",
                }}
              />
              <span
                className="eq-bar-2 block w-1 rounded-sm"
                style={{
                  height: "100%",
                  background: "#3DD6C8",
                  transformOrigin: "bottom",
                }}
              />
              <span
                className="eq-bar-3 block w-1 rounded-sm"
                style={{
                  height: "100%",
                  background: "#3DD6C8",
                  transformOrigin: "bottom",
                }}
              />
            </span>
          ) : (
            <span className="flex h-4 items-end gap-0.5">
              <span
                className="block w-1 rounded-sm"
                style={{
                  height: "60%",
                  background: "#3DD6C8",
                  transform: "scaleY(0.4)",
                  transformOrigin: "bottom",
                }}
              />
              <span
                className="block w-1 rounded-sm"
                style={{
                  height: "100%",
                  background: "#3DD6C8",
                  transform: "scaleY(0.4)",
                  transformOrigin: "bottom",
                }}
              />
              <span
                className="block w-1 rounded-sm"
                style={{
                  height: "80%",
                  background: "#3DD6C8",
                  transform: "scaleY(0.4)",
                  transformOrigin: "bottom",
                }}
              />
            </span>
          )
        ) : (
          <>
            <span className="text-[#B3B3B3] transition-opacity duration-150 group-hover:hidden">
              {track.trackNumber}
            </span>
            <Play
              size={14}
              fill="currentColor"
              className="hidden text-white group-hover:block"
            />
          </>
        )}
      </button>

      <div className="min-w-0">
        <button
          onClick={handleClick}
          className={`block truncate text-left text-sm font-medium ${
            isActive ? "text-[#3DD6C8]" : "text-white"
          }`}
        >
          {track.title}
        </button>
        {track.features?.length ? (
          <div className="truncate text-xs text-[#B3B3B3] transition-colors duration-150 group-hover:text-[#3DD6C8]">
            feat.{" "}
            <MaybeArtistLinkList
              names={track.features}
              slugsByName={artistSlugsByName}
            />
          </div>
        ) : null}
      </div>

      <div className="hidden text-sm text-[#B3B3B3] md:block">
        ${track.price.toFixed(2)}
      </div>

      <button
        onClick={handleBuy}
        className="hidden rounded-full border border-[#3DD6C8] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#3DD6C8] opacity-0 transition-opacity duration-150 hover:bg-[#3DD6C8]/10 group-hover:opacity-100 md:block"
      >
        Buy
      </button>

      <div className="text-right font-mono text-xs text-[#B3B3B3]">{track.duration}</div>
    </div>
  );
}
