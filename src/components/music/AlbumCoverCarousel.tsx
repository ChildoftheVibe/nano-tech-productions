"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";
import { getAlbumCover, getCoverVideo } from "@/lib/albumCover";

/**
 * Square album-cover surface that auto-advances through the static cover image
 * (always slide 0) and up to 4 short looping videos. Each slide dwells for
 * SLIDE_MS; video slides loop continuously while active and are paused when
 * off-screen to save bandwidth. Dot indicators and horizontal swipe allow
 * manual navigation; auto-advance pauses while the user is dragging. The cover
 * image stays static — it is never animated, matching the slideshow contract.
 */

const SLIDE_MS = 6000; // ~6s dwell, within the 5-7s loop window
const SWIPE_THRESHOLD = 40; // px before a drag counts as a swipe

type Slide =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string };

type Props = {
  coverImage: string;
  coverVideos?: string[];
  accent: string;
  bgColor: string;
  title: string;
  /** Cloudinary delivery size for both image and video. */
  size?: "md" | "lg" | number;
};

export function AlbumCoverCarousel({
  coverImage,
  coverVideos = [],
  accent,
  bgColor,
  title,
  size = "lg",
}: Props) {
  const slides: Slide[] = [];
  if (coverImage) slides.push({ kind: "image", src: getAlbumCover(coverImage, size) });
  for (const v of coverVideos.slice(0, 4)) {
    if (v) slides.push({ kind: "video", src: getCoverVideo(v, size) });
  }

  const [index, setIndex] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const dragStartX = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const slideCount = slides.length;
  const hasCarousel = slideCount > 1;

  const goTo = useCallback(
    (next: number) => {
      if (slideCount === 0) return;
      setIndex(((next % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  // Auto-advance timer — restarts whenever the active slide changes so a manual
  // swipe gives the new slide a full dwell. Skipped when only one slide exists.
  useEffect(() => {
    if (!hasCarousel) return;
    const t = window.setTimeout(() => goTo(index + 1), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [index, hasCarousel, goTo]);

  // Play only the active video; pause + rewind the rest.
  useEffect(() => {
    slides.forEach((slide, i) => {
      if (slide.kind !== "video") return;
      const el = videoRefs.current[i];
      if (!el) return;
      if (i === index) {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } else {
        el.pause();
        try {
          el.currentTime = 0;
        } catch {
          /* not yet seekable — harmless */
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slideCount]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!hasCarousel) return;
    dragStartX.current = e.clientX;
    draggingRef.current = true;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    draggingRef.current = false;
    if (Math.abs(dx) > SWIPE_THRESHOLD) goTo(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      className="relative w-full select-none"
      style={{
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        aspectRatio: "1 / 1",
        background: bgColor || "#0d1412",
        touchAction: "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStartX.current = null;
        draggingRef.current = false;
      }}
    >
      {slideCount === 0 ? (
        <div className="flex h-full w-full items-center justify-center">
          <Music size={64} style={{ color: accent, opacity: 0.5 }} />
        </div>
      ) : (
        slides.map((slide, i) => (
          <div
            key={`${slide.kind}-${i}`}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{
              opacity: i === index ? 1 : 0,
              pointerEvents: i === index ? "auto" : "none",
            }}
            aria-hidden={i === index ? undefined : true}
          >
            {slide.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.src}
                alt={`${title} album cover`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={slide.src}
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                preload={i <= index + 1 ? "auto" : "none"}
                crossOrigin="anonymous"
                aria-label={`${title} cover video ${i}`}
              />
            )}
          </div>
        ))
      )}

      {/* Slide indicators */}
      {hasCarousel ? (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 p-3">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 18 : 6,
                background: i === index ? accent : "rgba(255,255,255,0.45)",
                boxShadow:
                  i === index ? `0 0 8px ${accent}99` : "none",
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
