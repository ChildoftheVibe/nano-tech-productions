"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Music, Play } from "lucide-react";
import type { Album } from "@/types/music";

type Size = "sm" | "md" | "lg";

const dimensions: Record<Size, number> = {
  sm: 40,
  md: 180,
  lg: 230,
};

type Props = {
  album: Album;
  size?: Size;
  href?: string;
  showHoverPlay?: boolean;
  onPlay?: () => void;
};

export function AlbumCard({
  album,
  size = "md",
  href,
  showHoverPlay = false,
  onPlay,
}: Props) {
  const px = dimensions[size];
  const rounded = size === "sm" ? "rounded" : "rounded-md";

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
      {album.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={album.coverImage}
          alt={album.title}
          className="h-full w-full object-cover transition-[filter] duration-200 group-hover:brightness-[0.7]"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = "none";
            const sib = el.nextElementSibling as HTMLElement | null;
            if (sib) sib.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="hidden h-full w-full items-center justify-center"
        style={{ background: album.bgColor, color: album.accentColor }}
      >
        <Music size={Math.max(16, Math.floor(px / 4))} />
      </div>
      {showHoverPlay && onPlay ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlay();
          }}
          aria-label={`Play ${album.title}`}
          className="absolute bottom-2 right-2 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          style={{ background: "#3DD6C8" }}
        >
          <Play size={18} fill="black" className="ml-0.5 text-black" />
        </button>
      ) : null}
    </motion.div>
  );

  if (!href) return cover;
  return (
    <Link href={href} className="block">
      {cover}
    </Link>
  );
}
