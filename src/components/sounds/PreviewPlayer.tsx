"use client";

import { Music, Pause, Play } from "lucide-react";
import { useCheckoutStore, instrumentalCheckoutItem } from "@/store/checkoutStore";
import {
  usePreviewStore,
  PREVIEW_LIMIT_SECONDS,
} from "@/store/previewStore";
import type { Instrumental } from "@/types/music";
import { getAlbumCover } from "@/lib/albumCover";

type Props = {
  instrumental: Instrumental;
};

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export function PreviewPlayer({ instrumental }: Props) {
  const currentPreviewId = usePreviewStore((s) => s.currentPreviewId);
  const isPreviewPlaying = usePreviewStore((s) => s.isPreviewPlaying);
  const previewProgress = usePreviewStore((s) => s.previewProgress);
  const playPreview = usePreviewStore((s) => s.playPreview);
  const openCheckout = useCheckoutStore((s) => s.open);

  const isActive = currentPreviewId === instrumental.id;
  const isPlaying = isActive && isPreviewPlaying;
  const progress = isActive ? previewProgress : 0;
  const ended =
    isActive && !isPreviewPlaying && progress >= PREVIEW_LIMIT_SECONDS - 0.1;
  const percent = Math.min(100, (progress / PREVIEW_LIMIT_SECONDS) * 100);
  const remaining = Math.max(0, PREVIEW_LIMIT_SECONDS - progress);

  const cover = instrumental.coverImage
    ? getAlbumCover(instrumental.coverImage, "sm")
    : "";
  const previewUrl = instrumental.previewUrl ?? "";
  const canPlay = previewUrl.length > 0;

  const typeLabel =
    instrumental.type === "album_track" ? "ALBUM TRACK" : "SINGLE";

  const handlePlay = () => {
    if (!canPlay) return;
    playPreview(instrumental.id, previewUrl);
  };

  const handleBuy = () => {
    openCheckout(instrumentalCheckoutItem(instrumental));
  };

  const playLabel = isPlaying
    ? `Pause preview of ${instrumental.title}`
    : `Play 30-second preview of ${instrumental.title}`;

  return (
    <article
      className="flex flex-col gap-3 rounded-lg p-4"
      style={{
        background: "#282828",
        borderLeft: "3px solid #62f3e4",
      }}
      aria-label={`Instrumental: ${instrumental.title}`}
    >
      <div className="flex items-start gap-4">
        <div
          className="relative h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded"
          style={{ background: "#1a0838" }}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={`${instrumental.title} cover`}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-[#62f3e4]"
              aria-hidden="true"
            >
              <Music size={22} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#62f3e4]"
              style={{ background: "rgba(98,243,228,0.12)" }}
            >
              {typeLabel}
            </span>
            {instrumental.duration ? (
              <span className="font-mono text-[10px] text-[#B3B3B3]">
                {instrumental.duration}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 truncate text-sm font-bold text-white">
            {instrumental.title}
          </h3>
          {instrumental.description ? (
            <p className="mt-0.5 truncate text-xs text-[#B3B3B3]">
              {instrumental.description}
            </p>
          ) : null}
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="font-mono text-sm font-bold text-white">
            ${instrumental.price.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Progress + countdown */}
      <div>
        <div
          className="h-1 w-full overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
          aria-hidden="true"
        >
          <div
            className="h-full transition-[width] duration-100"
            style={{
              width: `${percent}%`,
              background: "#62f3e4",
            }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-[#B3B3B3]">
          <span>{isActive ? fmt(progress) : "0:00"}</span>
          <span>{isActive && isPlaying ? `${Math.ceil(remaining)}s left` : "30s preview"}</span>
        </div>
      </div>

      {ended ? (
        <p className="rounded border border-[#62f3e4]/30 bg-[#62f3e4]/5 px-3 py-2 text-xs text-[#62f3e4]">
          Preview ended — purchase to hear full track
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={!canPlay}
          aria-label={playLabel}
          aria-pressed={isPlaying}
          className="flex h-9 w-9 items-center justify-center rounded-full text-black transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ background: "#62f3e4" }}
        >
          {isPlaying ? (
            <Pause size={16} fill="currentColor" aria-hidden="true" />
          ) : (
            <Play size={16} fill="currentColor" aria-hidden="true" className="ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={handleBuy}
          aria-label={`Buy ${instrumental.title} for $${instrumental.price.toFixed(2)}`}
          className="ml-auto rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ background: "#ffabef" }}
        >
          Buy · ${instrumental.price.toFixed(2)}
        </button>
      </div>
    </article>
  );
}
