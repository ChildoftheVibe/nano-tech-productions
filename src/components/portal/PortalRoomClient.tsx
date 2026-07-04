"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PortalAlbum } from "@/lib/portalData";
import { PortalFallback2D } from "./PortalFallback2D";

const STORAGE_KEY = "ntv-portal-index";
const FLY_MS = 850;
const FLY_MS_REDUCED = 250;

function PortalLoading() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#090f0e]">
      <span className="animate-pulse font-[family-name:var(--font-bungee)] text-2xl tracking-tight text-[#62f3e4]">
        NTV VAULT
      </span>
    </div>
  );
}

/** Fail closed: any runtime error inside the 3D scene silently drops the
 *  experience to the 2D fallback — never a white screen on a store. */
class SceneErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// 3D scene loads only on this route, client-only, code-split from the rest of
// the app.
const PortalScene = dynamic(() => import("./PortalScene"), {
  ssr: false,
  loading: () => <PortalLoading />,
});

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

type Props = { albums: PortalAlbum[] };

export function PortalRoomClient({ albums }: Props) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [flying, setFlying] = useState(false);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const wheelAccum = useRef(0);
  const wheelLockUntil = useRef(0);
  const flyingRef = useRef(false);

  const count = albums.length;
  const album = albums[Math.min(index, count - 1)];

  // Environment detection + restore the previously focused portal so the back
  // button returns the visitor to the same doorway.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    // Deferred to the next frame so detection/restore don't force a render
    // cascade during the effect pass.
    const raf = requestAnimationFrame(() => {
      setWebglOk(detectWebGL());
      setReducedMotion(mq.matches);
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
      if (flyingRef.current) return;
      setIndex((i) => Math.min(count - 1, Math.max(0, i + delta)));
    },
    [count],
  );

  const enterPortal = useCallback(() => {
    if (flyingRef.current || !album) return;
    flyingRef.current = true;
    setFlying(true);
    window.setTimeout(
      () => router.push(`/album/${album.slug}`),
      reducedMotion ? FLY_MS_REDUCED : FLY_MS,
    );
  }, [album, reducedMotion, router]);

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

  const use3D = webglOk === true && !sceneFailed;
  const arrowClass =
    "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(26,33,32,0.7)] text-[#dde4e2] backdrop-blur-md transition-colors hover:border-[#62f3e4] hover:text-[#62f3e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] disabled:opacity-30 disabled:hover:border-[rgba(255,255,255,0.08)] disabled:hover:text-[#dde4e2]";

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
      {webglOk === null && <PortalLoading />}

      {use3D ? (
        <SceneErrorBoundary onError={() => setSceneFailed(true)}>
          <div className="absolute inset-0" aria-hidden="true">
            <PortalScene
              albums={albums}
              index={index}
              flying={flying}
              reducedMotion={reducedMotion}
            />
          </div>
        </SceneErrorBoundary>
      ) : webglOk === false || sceneFailed ? (
        <PortalFallback2D album={album} reducedMotion={reducedMotion} />
      ) : null}

      {/* Tap/click the portal itself to fly through. */}
      <button
        type="button"
        onClick={enterPortal}
        aria-label={`Enter ${album.title}`}
        className="absolute top-1/2 left-1/2 z-20 h-[min(60vw,50vh)] w-[min(60vw,50vh)] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
      />

      {/* Navigation arrows (desktop + mobile). */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between px-3 md:px-6">
        <button
          type="button"
          className={arrowClass}
          onClick={() => step(-1)}
          disabled={index === 0}
          aria-label="Previous album portal"
        >
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={arrowClass}
          onClick={() => step(1)}
          disabled={index === count - 1}
          aria-label="Next album portal"
        >
          <ChevronRight size={26} aria-hidden="true" />
        </button>
      </div>

      {/* Title + enter CTA + position dots. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-center gap-3 px-4 text-center">
        <h1
          className="font-[family-name:var(--font-bungee)] text-2xl tracking-tight text-[#dde4e2] md:text-4xl"
          style={{ textShadow: `0 0 24px ${album.accentColor}88` }}
        >
          {album.title}
        </h1>
        <p className="font-mono text-xs tracking-widest text-[#bbcac6] uppercase">
          Portal {index + 1} of {count}
        </p>
        <button
          type="button"
          onClick={enterPortal}
          className="pointer-events-auto min-h-11 rounded-full bg-[#62f3e4] px-8 py-2.5 font-semibold text-[#003733] teal-glow-hover transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Enter Portal
        </button>
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
      </div>

      {/* Screen-reader announcement of the focused portal. */}
      <div aria-live="polite" className="sr-only">
        {`${album.title}, portal ${index + 1} of ${count}`}
      </div>

      {/* Fly-through: energy fill in the album's color, then route. Reduced
          motion gets a simple crossfade instead. */}
      <AnimatePresence>
        {flying && (
          <motion.div
            key="fly"
            className="pointer-events-none absolute inset-0 z-30"
            initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.3 }}
            animate={{ opacity: 1, scale: reducedMotion ? 1 : 3 }}
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
    </section>
  );
}
