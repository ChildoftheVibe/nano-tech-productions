"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { chamberAsset, vortexAsset, type PortalAlbum } from "@/lib/portalData";
import { usePlayer } from "@/context/PlayerContext";
import { usePlayerStore } from "@/store/playerStore";
import { PortalChamber } from "./PortalChamber";
import { PortalGameGate } from "./PortalGameGate";

const STORAGE_KEY = "ntv-portal-index";
const FLY_MS = 850;
const FLY_MS_REDUCED = 250;

type Props = { albums: PortalAlbum[] };

export function PortalRoomClient({ albums }: Props) {
  const router = useRouter();
  const { playFromTrack, playAlbumBySlug } = usePlayer();
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [flying, setFlying] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [shared, setShared] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const showVideoRef = useRef(false);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const wheelAccum = useRef(0);
  const wheelLockUntil = useRef(0);
  const flyingRef = useRef(false);

  const count = albums.length;
  const album = albums[Math.min(index, count - 1)];
  // When the challenge gate or intro video overlays the chamber, the chamber's
  // own controls must not be tabbable or tappable.
  const chromeInert = showGate || showVideo;

  // Reduced-motion preference + restore the previously focused portal so the
  // back button returns the visitor to the same doorway.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    // Matches the Tailwind `md` breakpoint used elsewhere in this component.
    const mqMobile = window.matchMedia("(max-width: 767px)");
    const onMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mqMobile.addEventListener("change", onMobileChange);
    // Deferred to the next frame so detection/restore don't force a render
    // cascade during the effect pass.
    const raf = requestAnimationFrame(() => {
      setReducedMotion(mq.matches);
      setIsMobile(mqMobile.matches);
      const fromUrl = Number(new URLSearchParams(window.location.search).get("portal"));
      const fromSession = Number(sessionStorage.getItem(STORAGE_KEY));
      const restored = Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : fromSession;
      if (Number.isInteger(restored) && restored >= 0 && restored < count) {
        setIndex(restored);
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onChange);
      mqMobile.removeEventListener("change", onMobileChange);
    };
  }, [count]);

  // Fill the visible main-content area exactly (viewport minus sidebar chrome,
  // TopBar above, and the player bar below) without hardcoding their sizes.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const main = el.closest("main");
    const update = () => {
      if (!main) {
        setHeight(Math.round(window.innerHeight * 0.8));
        return;
      }
      const offsetInMain =
        el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
      setHeight(Math.max(420, main.clientHeight - offsetInMain));
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Persist the focused portal + prefetch the destination album page.
  useEffect(() => {
    if (!album) return;
    sessionStorage.setItem(STORAGE_KEY, String(index));
    const url = new URL(window.location.href);
    url.searchParams.set("portal", String(index));
    window.history.replaceState(window.history.state, "", url);
    router.prefetch(`/album/${album.slug}`);
  }, [index, album, router]);

  const step = useCallback(
    (delta: number) => {
      if (flyingRef.current || showVideoRef.current) return;
      setIndex((i) => Math.min(count - 1, Math.max(0, i + delta)));
    },
    [count],
  );

  // Fly-through animation, then the portal challenge (a random arcade game
  // that pays Nano Bucks) blocks the doorway; finishing or skipping it routes
  // to the album page.
  const beginFly = useCallback(() => {
    if (flyingRef.current || !album) return;
    flyingRef.current = true;
    setFlying(true);
    window.setTimeout(
      () => setShowGate(true),
      reducedMotion ? FLY_MS_REDUCED : FLY_MS,
    );
  }, [album, reducedMotion]);

  const finishGate = useCallback(() => {
    if (!album) return;
    // Hard document navigation into the album. Leaving the immersive portal
    // room is a full context switch, and a soft router.push can be dropped mid
    // transition while the gate's AnimatePresence exit is running (the symptom:
    // "Enter" appears to do nothing until a manual refresh). A document
    // navigation always commits and lands on the freshly-rendered album page.
    window.location.assign(`/album/${album.slug}`);
  }, [album]);

  const enterPortal = useCallback(() => {
    if (flyingRef.current || showVideoRef.current || !album) return;
    if (album.portalVideoUrl) {
      // Interstitial: show the admin-chosen vertical video and start the
      // album's playlist song inside the same user gesture (autoplay policy).
      showVideoRef.current = true;
      setShowVideo(true);
      const queueTrack = usePlayerStore
        .getState()
        .queue.find((t) => t.albumId === album.id && t.audioUrl);
      if (queueTrack) playFromTrack(queueTrack);
      else void playAlbumBySlug(album.slug);
      return;
    }
    beginFly();
  }, [album, beginFly, playFromTrack, playAlbumBySlug]);

  // Video finished or was skipped — continue the fly-through into the album.
  const finishVideo = useCallback(() => {
    if (!showVideoRef.current) return;
    showVideoRef.current = false;
    setShowVideo(false);
    beginFly();
  }, [beginFly]);

  // Dialog semantics for the interstitial: focus the skip control, Escape skips.
  useEffect(() => {
    if (!showVideo) return;
    skipButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finishVideo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showVideo, finishVideo]);

  // Pre-fetch the focused album's cover as a File so the share sheet can
  // attach the artwork without an async gap — Safari revokes the tap's
  // user-activation if we fetch inside the share handler itself.
  const coverFileRef = useRef<File | null>(null);
  useEffect(() => {
    coverFileRef.current = null;
    if (!album) return;
    let cancelled = false;
    fetch(album.coverUrl)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("cover fetch failed"))))
      .then((blob) => {
        if (cancelled || !blob.type.startsWith("image/")) return;
        const ext = blob.type.split("/")[1] ?? "jpg";
        coverFileRef.current = new File([blob], `${album.slug}-cover.${ext}`, {
          type: blob.type,
        });
      })
      .catch(() => {
        // Cover unavailable for attaching — share falls back to link-only.
      });
    return () => {
      cancelled = true;
    };
  }, [album]);

  // Native share sheet where available, clipboard fallback with visible
  // feedback. Shares the album page URL (its OG metadata serves the cover as
  // the link-preview image) and attaches the cover file so the artwork shows
  // inside the recipient's message composer where the platform supports it.
  const sharePortal = useCallback(async () => {
    if (!album) return;
    const url = `${window.location.origin}/album/${album.slug}`;
    const shareData: ShareData = {
      title: `${album.title} — NTV Vault`,
      text: `Step through the ${album.title} portal on NTV Vault`,
      url,
    };
    try {
      if (navigator.share) {
        const cover = coverFileRef.current;
        if (cover && navigator.canShare?.({ ...shareData, files: [cover] })) {
          await navigator.share({ ...shareData, files: [cover] });
        } else {
          await navigator.share(shareData);
        }
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }, [album]);

  // Desktop: ArrowLeft / ArrowRight.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // Mobile swipe with momentum + snap.
  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (!last) return;
      if (Math.abs(mx) > 60 || (vx > 0.4 && Math.abs(mx) > 20)) {
        step(dx < 0 ? 1 : -1);
      }
    },
    { axis: "x", filterTaps: true, pointer: { touch: true } },
  );

  // Desktop trackpad: horizontal scroll steps between portals.
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const now = performance.now();
      if (now < wheelLockUntil.current) return;
      wheelAccum.current += e.deltaX;
      if (Math.abs(wheelAccum.current) > 90) {
        step(wheelAccum.current > 0 ? 1 : -1);
        wheelAccum.current = 0;
        wheelLockUntil.current = now + 450;
      }
    },
    [step],
  );

  if (count === 0) return null;

  const neighbors = [albums[index - 1], albums[index + 1]].filter(Boolean) as PortalAlbum[];
  const accent = album.accentColor;
  const arrowClass =
    "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border bg-[rgba(9,15,14,0.55)] backdrop-blur-md transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-30 disabled:hover:scale-100";
  const arrowStyle: React.CSSProperties = {
    borderColor: `${accent}66`,
    color: accent,
    boxShadow: `0 0 14px ${accent}33`,
    "--tw-ring-color": accent,
  } as React.CSSProperties;

  return (
    <section
      ref={sectionRef}
      {...bind()}
      onWheel={onWheel}
      aria-roledescription="carousel"
      aria-label="Album portal room"
      className="relative w-full touch-pan-y overflow-hidden bg-[#090f0e] select-none"
      style={{ height: height ? `${height}px` : "70dvh" }}
    >
      <PortalChamber
        album={album}
        flying={flying}
        reducedMotion={reducedMotion}
        isMobile={isMobile}
      />

      {/* Warm the neighbor portals' chamber + vortex + cover so swipes are instant. */}
      <div className="hidden" aria-hidden="true">
        {neighbors.map((n) => (
          <span key={n.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- preload-only, static local asset */}
            <img src={chamberAsset(n.vortex)} alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element -- preload-only, static local asset */}
            <img src={vortexAsset(n.vortex)} alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element -- preload-only, Cloudinary-optimized */}
            <img src={n.coverUrl} alt="" />
          </span>
        ))}
      </div>

      {/* Tap/click the portal itself to fly through. While the challenge gate
          or intro video is open it is inert (and hidden from assistive tech) so
          a stray tap can never land on it instead of the gate, and its label
          doesn't duplicate the gate's "Enter" button. */}
      <button
        type="button"
        onClick={enterPortal}
        aria-label={`Enter ${album.title}`}
        aria-hidden={chromeInert}
        tabIndex={chromeInert ? -1 : 0}
        className={`absolute top-1/2 left-1/2 z-20 h-[min(60vw,50vh)] w-[min(60vw,50vh)] -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] ${
          chromeInert ? "pointer-events-none" : "cursor-pointer"
        }`}
      />

      {/* Navigation arrows (desktop + mobile). Desktop inset is wider than
          mobile so the arrows read as part of the chamber, away from the
          screen edge. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between px-5 md:px-20">
        <button
          type="button"
          className={arrowClass}
          style={arrowStyle}
          onClick={() => step(-1)}
          disabled={chromeInert || index === 0}
          aria-hidden={chromeInert}
          tabIndex={chromeInert ? -1 : 0}
          aria-label="Previous album portal"
        >
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={arrowClass}
          style={arrowStyle}
          onClick={() => step(1)}
          disabled={chromeInert || index === count - 1}
          aria-hidden={chromeInert}
          tabIndex={chromeInert ? -1 : 0}
          aria-label="Next album portal"
        >
          <ChevronRight size={26} aria-hidden="true" />
        </button>
      </div>

      {/* Album title, anchored above the CTA row with room for the platform's
          shiny orb detail beneath it, well below the vortex disc. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[20%] z-20 flex justify-center px-8 text-center md:bottom-[24%] md:px-16">
        {/* Padding is em-based against the title's own type size so the
            plaque scales with the words instead of sitting on fixed offsets.
            Generous em values keep the box clearly larger than the words at
            both breakpoints. */}
        <motion.div
          className="max-w-[92%] rounded-2xl border px-[3.6em] py-[1.15em] text-2xl backdrop-blur-md md:max-w-none md:text-4xl"
          style={{
            borderColor: `${accent}99`,
            background: "rgba(9,15,14,0.6)",
          }}
          animate={
            reducedMotion
              ? { boxShadow: `0 0 12px ${accent}55` }
              : {
                  boxShadow: [
                    `0 0 8px ${accent}40`,
                    `0 0 22px ${accent}90`,
                    `0 0 8px ${accent}40`,
                  ],
                }
          }
          transition={
            reducedMotion
              ? undefined
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <h1
            className="font-[family-name:var(--font-bungee)] text-[length:inherit] leading-tight tracking-tight"
            style={{
              color: accent,
              textShadow: `0 0 10px ${accent}aa, 0 0 24px ${accent}88, 0 0 44px ${accent}44, 0 2px 8px rgba(0,0,0,0.7)`,
            }}
          >
            {album.title}
          </h1>
        </motion.div>
      </div>

      {/* Enter/share CTAs + position dots + copyright, lifted off the very
          bottom edge (percentage-based, like the title) so the whole cluster
          stays inside the viewport without scrolling on short screens. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[6%] z-20 flex flex-col items-center gap-2.5 px-8 text-center md:bottom-[8%] md:px-16">
        {/* CTA pills mirror the album-page action buttons (flat accent fill +
            outline pill, 0.06em tracking) at a smaller footprint. A shared
            min-width makes both pills read as substantial, evenly-sized
            buttons; min-h-11 keeps the 44px ADA touch target. */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={enterPortal}
            aria-hidden={chromeInert}
            tabIndex={chromeInert ? -1 : 0}
            className={`flex min-h-11 min-w-[176px] items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-xs font-bold tracking-[0.06em] uppercase transition-transform duration-300 hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f0e] ${
              chromeInert ? "pointer-events-none" : "pointer-events-auto"
            }`}
            style={{
              background: accent,
              color: "#003733",
              boxShadow: `0 0 20px ${accent}4d`,
            }}
          >
            Enter Portal
          </button>
          <button
            type="button"
            onClick={sharePortal}
            aria-label={`Share the ${album.title} portal`}
            className="pointer-events-auto flex min-h-11 min-w-[140px] items-center justify-center gap-2 rounded-lg border px-8 py-3.5 text-xs font-semibold tracking-[0.06em] uppercase backdrop-blur-md transition-transform duration-300 hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f0e]"
            style={{
              borderColor: `${accent}99`,
              color: accent,
              background: "rgba(9,15,14,0.6)",
              boxShadow: `0 0 12px ${accent}33`,
            }}
          >
            <Share2 size={16} aria-hidden="true" />
            {shared ? "Copied!" : "Share"}
          </button>
        </div>
        <div className="flex items-center gap-2" aria-hidden="true">
          {albums.map((a, i) => (
            <span
              key={a.id}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 20 : 6,
                background: i === index ? a.accentColor : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
        <p className="text-[10px] leading-tight tracking-wide text-[#b3b3b3]">
          © {new Date().getFullYear()} Nano Tech Productions. All rights reserved.
        </p>
      </div>

      {/* Screen-reader announcement of the clipboard share fallback. */}
      <div aria-live="polite" className="sr-only">
        {shared ? "Portal link copied to clipboard" : ""}
      </div>

      {/* Screen-reader announcement of the focused portal. */}
      <div aria-live="polite" className="sr-only">
        {`${album.title}, portal ${index + 1} of ${count}`}
      </div>

      {/* Portal intro video interstitial: the admin-chosen vertical video
          plays (muted) while the album's playlist song plays through the
          site player; the fly-through resumes when it ends or is skipped. */}
      <AnimatePresence>
        {showVideo && album.portalVideoUrl && (
          <motion.div
            key="portal-video"
            role="dialog"
            aria-modal="true"
            aria-label={`${album.title} portal intro video`}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.35 }}
          >
            <video
              src={album.portalVideoUrl}
              autoPlay
              muted
              playsInline
              onEnded={finishVideo}
              className="max-h-[76%] w-auto max-w-[88%] rounded-2xl object-contain"
              style={{
                border: `1px solid ${accent}66`,
                boxShadow: `0 0 60px ${accent}55, 0 12px 48px rgba(0,0,0,0.7)`,
              }}
            />
            <button
              ref={skipButtonRef}
              type="button"
              onClick={finishVideo}
              className="min-h-11 rounded-lg border px-6 py-2 text-[11px] font-bold tracking-[0.25em] uppercase backdrop-blur-md transition-transform duration-300 hover:scale-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              style={{
                borderColor: `${accent}99`,
                color: accent,
                background: "rgba(9,15,14,0.6)",
                boxShadow: `0 0 16px ${accent}44`,
              }}
            >
              Enter Album
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fly-through: energy fill in the album's color layered over the camera
          push into the vortex. Reduced motion gets a simple crossfade. */}
      <AnimatePresence>
        {flying && (
          <motion.div
            key="fly"
            className="pointer-events-none absolute inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: (reducedMotion ? FLY_MS_REDUCED : FLY_MS) / 1000,
              ease: "easeIn",
            }}
            style={{
              background: `radial-gradient(circle at center, ${album.accentColor} 0%, ${album.bgColor} 55%, #090f0e 100%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Portal challenge: random arcade game over the energy fill. */}
      <AnimatePresence>
        {showGate && (
          <PortalGameGate
            key="gate"
            accent={album.accentColor}
            albumTitle={album.title}
            onDone={finishGate}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
