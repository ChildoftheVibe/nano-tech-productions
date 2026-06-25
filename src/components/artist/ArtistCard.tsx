"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Artist } from "@/types/music";
import { getAlbumCover } from "@/lib/albumCover";

type Size = "sm" | "md";

const dimensions: Record<Size, number> = {
  sm: 56,
  md: 140,
};

const ROLE_LABELS: Record<string, string> = {
  primary: "Primary Artist",
  featured: "Featured Artist",
  producer: "Producer",
  songwriter: "Songwriter",
  engineer: "Engineer",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

type Props = {
  artist: Artist;
  size?: Size;
};

export function ArtistCard({ artist, size = "md" }: Props) {
  const dim = dimensions[size];
  const roleLabel = ROLE_LABELS[artist.role] ?? "Featured Artist";

  return (
    <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.15 }}>
      <Link
        href={`/artist/${artist.slug}`}
        className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/5"
      >
        <div
          className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/5 font-mono font-bold text-[#62f3e4]"
          style={{
            width: dim,
            height: dim,
            fontSize: size === "sm" ? 18 : 36,
          }}
          aria-hidden
        >
          {artist.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getAlbumCover(artist.profileImage, dim)}
              alt={`${artist.name} profile photo`}
              className="h-full w-full object-cover"
            />
          ) : (
            initials(artist.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`truncate font-semibold text-white ${
              size === "sm" ? "text-sm" : "text-base"
            }`}
          >
            {artist.name}
          </div>
          <div className="truncate text-xs uppercase tracking-[0.15em] text-[#B3B3B3]">
            {roleLabel}
          </div>
          {artist.location ? (
            <div className="truncate text-[11px] text-white/40">
              {artist.location}
            </div>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}
