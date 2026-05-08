"use client";

import { Play } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useCheckoutStore, trackCheckoutItem } from "@/store/checkoutStore";
import type { Album, Track } from "@/types/music";

type Props = {
  track: Track;
  album: Album;
};

export function TrackRow({ track, album }: Props) {
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
      className={`group grid grid-cols-[40px_1fr_120px_80px_60px] items-center gap-4 rounded-md px-4 py-2 transition-colors hover:bg-white/5 ${
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
                className="block w-1 animate-pulse rounded-sm"
                style={{ height: "60%", background: "#3DD6C8" }}
              />
              <span
                className="block w-1 animate-pulse rounded-sm"
                style={{ height: "100%", background: "#3DD6C8", animationDelay: "0.15s" }}
              />
              <span
                className="block w-1 animate-pulse rounded-sm"
                style={{ height: "40%", background: "#3DD6C8", animationDelay: "0.3s" }}
              />
            </span>
          ) : (
            <Play size={14} fill="#3DD6C8" className="text-[#3DD6C8]" />
          )
        ) : (
          <>
            <span className="text-[#B3B3B3] group-hover:hidden">{track.trackNumber}</span>
            <Play
              size={14}
              fill="currentColor"
              className="hidden text-white group-hover:block"
            />
          </>
        )}
      </button>

      <button onClick={handleClick} className="min-w-0 text-left">
        <div
          className={`truncate text-sm font-medium ${
            isActive ? "text-[#3DD6C8]" : "text-white"
          }`}
        >
          {track.title}
        </div>
        {track.features?.length ? (
          <div className="truncate text-xs text-[#B3B3B3]">
            feat. {track.features.join(", ")}
          </div>
        ) : null}
      </button>

      <div className="text-sm text-[#B3B3B3]">${track.price.toFixed(2)}</div>

      <button
        onClick={handleBuy}
        className="rounded-full border border-[#3DD6C8] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#3DD6C8] opacity-0 transition-opacity hover:bg-[#3DD6C8]/10 group-hover:opacity-100"
      >
        Buy
      </button>

      <div className="text-right font-mono text-xs text-[#B3B3B3]">{track.duration}</div>
    </div>
  );
}
