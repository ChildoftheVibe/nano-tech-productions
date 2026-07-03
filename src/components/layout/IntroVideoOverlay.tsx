"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, Volume2, VolumeX } from "lucide-react";
import type { IntroVideo } from "@/lib/queries";

/**
 * Full-screen landing pop-up video.
 *
 * - Portrait (9:16) source on mobile, landscape (16:9) on desktop. Falls back to
 *   whichever single source the admin uploaded.
 * - Desktop plays at maximum size letterboxed over the selected album's color
 *   gradient; mobile fills the viewport and covers the player + tab bars.
 * - Dismissed by the X or when the video finishes → minimize animation reveals
 *   the selected album's detail page underneath.
 * - Mobile orientation lock: if the phone is turned landscape, the video is
 *   counter-rotated so it keeps playing vertically, nudging the visitor to turn
 *   back to portrait. Native `screen.orientation.lock` is attempted first (works
 *   in an installed PWA / fullscreen).
 * - Replay: `session` shows once per browser session; `always` shows on every
 *   full page load.
 */
export function IntroVideoOverlay({ video }: { video: IntroVideo | null }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [show, setShow] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [minimizing, setMinimizing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [rotate, setRotate] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const seenKey = video ? `ntv:intro-seen:${video.id}` : "";

  // ── Decide whether to show, once, on mount ────────────────────────────────
  useEffect(() => {
    if (!video) return;
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    const src = desktop
      ? video.landscapeUrl ?? video.portraitUrl
      : video.portraitUrl ?? video.landscapeUrl;
    if (!src) return;

    if (video.replayMode === "session") {
      try {
        if (sessionStorage.getItem(seenKey)) return;
      } catch {
        /* storage blocked — show anyway */
      }
    }
    setIsDesktop(desktop);
    setShow(true);
  }, [video, seenKey]);

  // ── Playback + scroll lock while shown ────────────────────────────────────
  useEffect(() => {
    if (!show) return;
    // Silence any site audio that unlocked before the visitor landed.
    document.querySelectorAll("audio").forEach((a) => a.pause());

    const el = videoRef.current;
    if (el) {
      el.muted = false;
      el.play()
        .then(() => setMuted(false))
        .catch(() => {
          // Autoplay-with-sound blocked — fall back to muted playback.
          el.muted = true;
          setMuted(true);
          el.play().catch(() => {});
        });
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [show]);

  // ── Mobile orientation lock / counter-rotate ──────────────────────────────
  useEffect(() => {
    if (!show || isDesktop) return;

    const orientation = (
      screen as unknown as {
        orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void };
      }
    ).orientation;
    try {
      orientation?.lock?.("portrait").catch(() => {});
    } catch {
      /* not supported outside fullscreen — CSS fallback handles it */
    }

    const mq = window.matchMedia("(orientation: landscape)");
    const update = () => {
      setRotate(mq.matches);
      setDims({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      try {
        orientation?.unlock?.();
      } catch {
        /* ignore */
      }
    };
  }, [show, isDesktop]);

  const dismiss = useCallback(() => {
    setMinimizing((m) => {
      if (m) return m;
      try {
        if (seenKey) sessionStorage.setItem(seenKey, "1");
      } catch {
        /* ignore */
      }
      return true;
    });
  }, [seenKey]);

  const finish = useCallback(() => {
    setShow(false);
    if (video?.album?.slug) router.push(`/album/${video.album.slug}`);
  }, [router, video?.album?.slug]);

  // Esc dismisses.
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, dismiss]);

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    const next = !el.muted;
    el.muted = next;
    setMuted(next);
    if (!next) el.play().catch(() => {});
  };

  if (!video || !show) return null;

  const src = isDesktop
    ? video.landscapeUrl ?? video.portraitUrl
    : video.portraitUrl ?? video.landscapeUrl;
  if (!src) return null;

  const album = video.album;
  const background =
    isDesktop && album
      ? `radial-gradient(circle at 50% 35%, ${album.accentColor}33, ${album.bgColor} 72%)`
      : "#000";

  // On a landscape phone, counter-rotate a portrait-sized box back to vertical.
  const stageStyle: React.CSSProperties =
    !isDesktop && rotate
      ? {
          position: "absolute",
          top: "50%",
          left: "50%",
          width: dims.h,
          height: dims.w,
          transform: "translate(-50%, -50%) rotate(90deg)",
        }
      : { position: "absolute", inset: 0 };

  const controls = (
    <>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close intro video"
        className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <X size={20} />
      </button>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </>
  );

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background }}
      initial={{ opacity: 0 }}
      animate={
        minimizing
          ? { opacity: 0, scale: 0.08, borderRadius: 48 }
          : { opacity: 1, scale: 1, borderRadius: 0 }
      }
      transition={{ duration: minimizing ? 0.6 : 0.35, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={() => {
        if (minimizing) finish();
      }}
    >
      {isDesktop ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            ref={videoRef}
            src={src}
            className="h-full max-h-full w-auto max-w-full object-contain"
            autoPlay
            playsInline
            preload="auto"
            onEnded={dismiss}
          />
          {controls}
        </div>
      ) : (
        <div style={stageStyle} className="overflow-hidden">
          <video
            ref={videoRef}
            src={src}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            preload="auto"
            onEnded={dismiss}
          />
          {controls}
        </div>
      )}
    </motion.div>
  );
}
