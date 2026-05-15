"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Music, Play } from "lucide-react";
import type { Album } from "@/types/music";
import {
  getAlbumCover,
  ALBUM_COVER_BLUR_DATA_URL,
  type AlbumCoverSize,
} from "@/lib/albumCover";

type Size = "sm" | "md" | "lg";

const dimensions: Record<Size, number> = {
  sm: 40,
  md: 180,
  lg: 230,
};

const coverSizeFor: Record<Size, AlbumCoverSize> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

// Browser hint for layout; the upstream Cloudinary URL already carries the
// resolved pixel size, but `sizes` keeps the prop wired up for any future
// move off `unoptimized`.
const SIZES_ATTR =
  "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 180px";

type Props = {
  album: Album;
  size?: Size;
  href?: string;
  showHoverPlay?: boolean;
  onPlay?: () => void;
  /**
   * Mark this card as above-the-fold. Emits the image with `preload`
   * (Next 16's replacement for the deprecated `priority` prop) so the
   * browser starts fetching during HTML streaming.
   */
  priority?: boolean;
  /** Forwarded to the underlying <img> for LCP candidates. */
  fetchPriority?: "high" | "low" | "auto";
};

export function AlbumCard({
  album,
  size = "md",
  href,
  showHoverPlay = false,
  onPlay,
  priority = false,
  fetchPriority,
}: Props) {
  const px = dimensions[size];
  const rounded = size === "sm" ? "rounded" : "rounded-md";
  const optimizedSrc = album.coverImage
    ? getAlbumCover(album.coverImage, coverSizeFor[size])
    : "";
  const year = album.releaseDate?.slice(0, 4) ?? "";
  const cardLabel = year ? `${album.title}, ${year}` : album.title;

  const cover = (
    <motion.div
      className={`group relative flex-shrink-0 overflow-hidden ${rounded}`}
      style={{
        width: px,
        height: px,
        background: album.bgColor,
        boxShadow: size === "lg" ? "0 8px 24px rgba(0,0,0,0.5)" : undefined,
      }}
      whileHover={size !== "sm" ? { scale: 1.04 } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {optimizedSrc ? (
        <Image
          src={optimizedSrc}
          alt={`${album.title} album cover`}
          fill
          sizes={SIZES_ATTR}
          placeholder="blur"
          blurDataURL={ALBUM_COVER_BLUR_DATA_URL}
          preload={priority || undefined}
          fetchPriority={fetchPriority}
          unoptimized
          className="object-cover transition-[filter] duration-200 group-hover:brightness-[0.7]"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const sib = el.nextElementSibling as HTMLElement | null;
            if (sib) sib.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className={`${optimizedSrc ? "hidden" : "flex"} absolute inset-0 h-full w-full items-center justify-center`}
        style={{ background: album.bgColor, color: album.accentColor }}
      >
        <Music size={Math.max(16, Math.floor(px / 4))} aria-hidden="true" />
      </div>
      {showHoverPlay && onPlay ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlay();
          }}
          aria-label={`Play ${album.title}`}
          className="absolute bottom-2 right-2 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ background: "#3DD6C8" }}
        >
          <Play size={18} fill="black" className="ml-0.5 text-black" aria-hidden="true" />
        </button>
      ) : null}
    </motion.div>
  );

  if (!href) return cover;
  return (
    <Link href={href} aria-label={cardLabel} className="block">
      {cover}
    </Link>
  );
}
