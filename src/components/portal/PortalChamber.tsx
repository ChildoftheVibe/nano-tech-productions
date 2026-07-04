"use client";

import { AnimatePresence, motion } from "framer-motion";
import { chamberAsset, vortexAsset, type PortalAlbum } from "@/lib/portalData";

/** Geometry of the widescreen chamber plate (public/portals/chamber.webp).
 *  The vortex crops (vortex-<name>.webp) were cut from the identical-background
 *  source plates at these coordinates, so layering them here is pixel-exact. */
const PLATE = { w: 2688, h: 1152 };
const VORTEX_CROP = { x: 1090, y: 283, size: 512 };
const VORTEX_CENTER = { x: 1346, y: 539 };

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/** A tiny ship silhouette that drifts across the distant starfield on a slow
 *  loop — enough motion to make the chamber feel alive, never busy. The
 *  flight path stays in the upper sky so it reads as far behind the gate. */
function SpaceshipFlyby() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ top: "11%", width: "3%", opacity: 0.55 }}
      initial={{ left: "-5%" }}
      animate={{ left: ["-5%", "105%"], y: [0, -10, 4, 0], rotate: -3 }}
      transition={{
        duration: 28,
        ease: "linear",
        repeat: Infinity,
        repeatDelay: 14,
      }}
    >
      <svg viewBox="-16 0 80 20" className="h-auto w-full">
        <defs>
          <linearGradient id="ship-trail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#62f3e4" stopOpacity="0" />
            <stop offset="1" stopColor="#62f3e4" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect x="-16" y="10.4" width="18" height="1.4" rx="0.7" fill="url(#ship-trail)" />
        <path d="M2 12 L40 8 L60 11 L40 15 Z" fill="#aebfc9" opacity="0.9" />
        <path d="M38 9 L46 3.5 L50 9.5 Z" fill="#8fa3ad" opacity="0.85" />
        <circle cx="53" cy="11" r="1.5" fill="#d7fbf6" />
      </svg>
    </motion.div>
  );
}

type Props = {
  album: PortalAlbum;
  flying: boolean;
  reducedMotion: boolean;
};

/** One static stargate chamber. The environment (stone ring, platform,
 *  starfield) never changes; only the vortex energy and the album cover
 *  crossfade between portals — that is what makes transitions seamless. */
export function PortalChamber({ album, flying, reducedMotion }: Props) {
  const vortexUrl = vortexAsset(album.vortex);
  const chamberUrl = chamberAsset(album.vortex);
  const flyDuration = reducedMotion ? 0.25 : 0.85;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05090a]" aria-hidden="true">
      {/* Cover-fit stage: keeps the plate's aspect so the vortex overlay
          coordinates stay pixel-aligned at any viewport size. */}
      <motion.div
        className="absolute top-1/2 left-1/2"
        style={{
          aspectRatio: `${PLATE.w} / ${PLATE.h}`,
          minWidth: "100%",
          minHeight: "100%",
          x: "-50%",
          y: "-50%",
          transformOrigin: `${pct(VORTEX_CENTER.x, PLATE.w)} ${pct(VORTEX_CENTER.y, PLATE.h)}`,
        }}
        animate={{ scale: flying && !reducedMotion ? 5.5 : 1 }}
        transition={{ duration: flyDuration, ease: "easeIn" }}
      >
        {/* Chamber plate — platform hue + light reflections are baked to match
            the portal color (Adobe-recolored variants). The sky/ring pixels
            are identical across variants, so crossfading only ever appears to
            change the machinery's lighting. */}
        <AnimatePresence>
          <motion.img
            key={chamberUrl}
            src={chamberUrl}
            alt=""
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.6, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-fill"
          />
        </AnimatePresence>

        {/* Ambient life: a distant ship crossing the upper starfield. */}
        {!reducedMotion && <SpaceshipFlyby />}

        {/* Vortex energy — crossfades with the chamber between portals. */}
        <AnimatePresence>
          <motion.img
            key={album.vortex}
            src={vortexUrl}
            alt=""
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.6, ease: "easeInOut" }}
            className="absolute"
            style={{
              left: pct(VORTEX_CROP.x, PLATE.w),
              top: pct(VORTEX_CROP.y, PLATE.h),
              width: pct(VORTEX_CROP.size, PLATE.w),
              height: pct(VORTEX_CROP.size, PLATE.h),
              // The disc-edge feather is baked into the webp's alpha channel
              // (elliptical, exactly at the disc edge) — CSS masks proved
              // unreliable here (radial-gradient sizes to farthest-corner).
            }}
          />
        </AnimatePresence>

        {/* Album cover floating inside the vortex. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={album.id}
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.45, ease: "easeOut" }}
            className="absolute"
            style={{
              left: pct(VORTEX_CENTER.x, PLATE.w),
              top: pct(VORTEX_CENTER.y, PLATE.h),
              height: "26%",
              aspectRatio: "1 / 1",
              translate: "-50% -50%",
            }}
          >
            <motion.div
              className="h-full w-full"
              animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
              transition={
                reducedMotion
                  ? undefined
                  : { duration: 6, repeat: Infinity, ease: "easeInOut" }
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- coverUrl is already Cloudinary-optimized via getAlbumCover */}
              <img
                src={album.coverUrl}
                alt=""
                draggable={false}
                className="h-full w-full rounded-xl object-cover"
                style={{
                  border: `1px solid ${album.accentColor}66`,
                  boxShadow: `0 0 60px ${album.accentColor}55, 0 0 20px ${album.accentColor}88, 0 12px 40px rgba(0,0,0,0.6)`,
                }}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
