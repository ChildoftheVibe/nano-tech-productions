"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Music, Play } from "lucide-react";
import type { Album } from "@/types/music";
import { getAlbumCover, type AlbumCoverSize } from "@/lib/albumCover";
import { useState } from 'react'
import AlbumCoverModal from '@/components/music/AlbumCoverModal'

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

type Props = {
  album: Album;
  size?: Size;
  href?: string;
  showHoverPlay?: boolean;
  onPlay?: () => void;
  priority?: boolean;
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

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState('')

  const cover = (
    <motion.div
      className={`group relative flex-shrink-0 overflow-hidden ${rounded}`}
      style={{
        width: px,
        height: px,
        background: album.bgColor,
        boxShadow: size === "lg" ? "0 8px 24px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.4)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      whileHover={size !== "sm" ? { scale: 1.04 } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {optimizedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={optimizedSrc}
          alt={`${album.title} album cover`}
          className={`absolute inset-0 h-full w-full object-cover transition-[filter] duration-200 group-hover:brightness-[0.7]${!href ? ' cursor-pointer md:cursor-zoom-in' : ''}`}
          onClick={!href ? () => { setModalImageUrl(optimizedSrc); setIsModalOpen(true) } : undefined}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={fetchPriority}
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
      {album.album_type === 'ep' && (
        <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#62f3e4]/15 text-[#62f3e4] border border-[#62f3e4]/30 pointer-events-none">
          EP
        </span>
      )}
      {showHoverPlay && onPlay ? (
        <>
          <div className="absolute inset-0 bg-[#121212]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlay();
            }}
            aria-label={`Play ${album.title}`}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 focus-visible:outline-none"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full shadow-xl"
              style={{ background: "#62f3e4", boxShadow: "0 0 20px rgba(98,243,228,0.4)" }}
            >
              <Play size={20} fill="#003733" className="ml-0.5 text-[#003733]" aria-hidden="true" />
            </span>
          </button>
        </>
      ) : null}
    </motion.div>
  );

  if (!href) return (
    <>
      {cover}
      <AlbumCoverModal
        isOpen={isModalOpen}
        imageUrl={modalImageUrl}
        altText="Album cover"
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
  return (
    <Link href={href} aria-label={cardLabel} className="block">
      {cover}
    </Link>
  );
}
