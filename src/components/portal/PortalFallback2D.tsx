"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PortalAlbum } from "@/lib/portalData";

type Props = {
  album: PortalAlbum;
  reducedMotion: boolean;
};

/** Polished 2D portal: full-screen album art card with a CSS glow treatment.
 *  Purely presentational — all navigation (swipe, arrows, keyboard) lives in
 *  PortalRoomClient so this path proves the experience works without WebGL. */
export function PortalFallback2D({ album, reducedMotion }: Props) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `radial-gradient(ellipse at center, ${album.accentColor}22 0%, #090f0e 72%)`,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={album.id}
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.02 }}
          transition={{ duration: reducedMotion ? 0.15 : 0.35, ease: "easeOut" }}
          className="relative flex items-center justify-center"
        >
          <div
            aria-hidden="true"
            className={reducedMotion ? "" : "animate-pulse"}
            style={{
              position: "absolute",
              inset: "-6%",
              borderRadius: "9999px",
              boxShadow: `0 0 90px ${album.accentColor}55, 0 0 30px ${album.accentColor}88`,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- coverUrl is already Cloudinary-optimized via getAlbumCover */}
          <img
            src={album.coverUrl}
            alt={`${album.title} album cover`}
            draggable={false}
            className="relative h-[min(62vw,52vh)] w-[min(62vw,52vh)] rounded-full object-cover select-none"
            style={{ border: `2px solid ${album.accentColor}66` }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
