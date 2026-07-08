"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";

const SECTION_LINE = /^\s*\[[^\]]+\]\s*$/;

// Playlist-seeded queue tracks omit lyrics to keep the page payload small
// (see PLAYLIST_TRACK_COLUMNS in queries.ts); fetched lyrics are cached here
// per track id for the life of the session.
const lyricsCache = new Map<string, string | null>();

function renderLyrics(lyrics: string) {
  return lyrics.split("\n").map((line, i) => {
    if (line.trim() === "") {
      return <div key={i} className="h-[1.6em]" aria-hidden="true" />;
    }
    if (SECTION_LINE.test(line)) {
      return (
        <p
          key={i}
          className="font-mono text-[#62f3e4]"
          style={{ fontSize: 16, lineHeight: 1.9 }}
        >
          {line.trim()}
        </p>
      );
    }
    return (
      <p
        key={i}
        className="font-mono"
        style={{ fontSize: 16, lineHeight: 1.9, color: "rgba(255,255,255,0.9)" }}
      >
        {line}
      </p>
    );
  });
}

export function LyricsModal() {
  const open = usePlayerStore((s) => s.lyricsOpen);
  const close = usePlayerStore((s) => s.closeLyrics);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);

  const [fetchedLyrics, setFetchedLyrics] = useState<string | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Move focus to the close button when the modal opens; return focus to
  // whatever triggered it on close. AT users get a clear in/out experience.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  // Auto-close if the active track has no lyrics.
  useEffect(() => {
    if (open && currentTrack && !currentTrack.has_lyrics) close();
  }, [open, currentTrack, close]);

  // Queue tracks seeded from the playlist ship without lyrics text (payload
  // weight) — fetch on demand the first time the modal opens for them.
  useEffect(() => {
    if (!open || !currentTrack) return;
    const { id, lyrics, has_lyrics } = currentTrack;
    if (lyrics != null || !has_lyrics) {
      setFetchedLyrics(null);
      setLoadingLyrics(false);
      return;
    }
    if (lyricsCache.has(id)) {
      setFetchedLyrics(lyricsCache.get(id) ?? null);
      setLoadingLyrics(false);
      return;
    }
    let cancelled = false;
    setFetchedLyrics(null);
    setLoadingLyrics(true);
    fetch(`/api/tracks/${id}/lyrics`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { lyrics?: string | null } | null) => {
        if (cancelled) return;
        const text = data?.lyrics ?? null;
        lyricsCache.set(id, text);
        setFetchedLyrics(text);
        setLoadingLyrics(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingLyrics(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentTrack]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc key closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Reset scroll on track change.
  useEffect(() => {
    if (!open) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [currentTrack?.id, open]);

  const onDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    if (info.offset.y > 100 || info.velocity.y > 500) close();
  };

  const features = currentTrack?.features?.length
    ? `Jhodge feat. ${currentTrack.features.join(", ")}`
    : "Jhodge";
  const subtitle = currentAlbum?.title
    ? `${features} — ${currentAlbum.title}`
    : features;

  return (
    <AnimatePresence>
      {open && currentTrack ? (
        <motion.div
          key="lyrics-overlay"
          className="fixed inset-0 z-[9998] bg-[#121212]/85 backdrop-blur-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25, ease: "easeIn" } }}
          onClick={close}
          aria-modal="true"
          role="dialog"
          aria-label={`Lyrics for ${currentTrack.title}`}
        >
          <motion.div
            className="absolute inset-0 flex flex-col"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%", transition: { duration: 0.25, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 300 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <header
              className="flex flex-shrink-0 items-center justify-between px-4"
              style={{ height: 56, background: "rgba(0,0,0,0.5)" }}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">
                  {currentTrack.title}
                </div>
                <div className="truncate text-xs text-[#B3B3B3]">{subtitle}</div>
              </div>
              <button
                ref={closeButtonRef}
                onClick={close}
                aria-label="Close lyrics"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
              >
                <ChevronDown size={24} aria-hidden="true" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="ntv-lyrics-scroll flex-1 overflow-y-auto px-8 py-6 text-center"
              style={{
                paddingBottom: 120,
                scrollBehavior: "smooth",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "thin",
                scrollbarColor: "#62f3e4 transparent",
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {(() => {
                    const lyrics = currentTrack.lyrics ?? fetchedLyrics;
                    if (lyrics && lyrics.trim().length > 0) return renderLyrics(lyrics);
                    if (loadingLyrics) {
                      return (
                        <p className="font-mono text-sm text-white/50">Loading lyrics…</p>
                      );
                    }
                    return (
                      <p className="font-mono text-sm text-white/50">
                        No lyrics available for this track.
                      </p>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>

            <style jsx>{`
              .ntv-lyrics-scroll::-webkit-scrollbar {
                width: 4px;
              }
              .ntv-lyrics-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .ntv-lyrics-scroll::-webkit-scrollbar-thumb {
                background: #62f3e4;
                border-radius: 2px;
              }
            `}</style>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
