"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  ChevronDown,
  ListMusic,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  ShoppingBag,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlayer } from "@/context/PlayerContext";
import { useCheckoutStore } from "@/store/checkoutStore";
import { getAlbumCover } from "@/lib/albumCover";

const formatTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export function FullScreenPlayer() {
  const open = usePlayerStore((s) => s.fullScreenOpen);
  const close = usePlayerStore((s) => s.closeFullScreen);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const queueLen = usePlayerStore((s) => s.queue.length);
  const queue = usePlayerStore((s) => s.queue);

  const openCheckout = useCheckoutStore((s) => s.open);
  const router = useRouter();

  // Use the PlayerContext helpers so audio.play() runs synchronously in the
  // click handler and the user-gesture token survives.
  const { togglePlayPause, nextAndPlay, previousAndPlay } = usePlayer();

  const handleBuyTrack = () => {
    if (!currentTrack) return;
    close();
    openCheckout({
      id: currentTrack.id,
      kind: "track",
      name: currentTrack.title,
      price: currentTrack.price,
      coverImage: currentAlbum?.coverImage,
      bgColor: currentAlbum?.bgColor,
      accentColor: currentAlbum?.accentColor,
      trackIds: [currentTrack.id],
      albumId: currentAlbum?.id,
    });
  };

  const handleViewAlbum = () => {
    if (!currentAlbum) return;
    close();
    router.push(`/album/${currentAlbum.slug}`);
  };
  const seekTo = usePlayerStore((s) => s.seekTo);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat);

  // Lock body scroll while overlay is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Auto-close if there's nothing to play.
  useEffect(() => {
    if (open && !currentTrack) close();
  }, [open, currentTrack, close]);

  // Escape closes the overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Trap entry: focus close button on open, return focus on close.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) close();
  };

  const features = currentTrack?.features?.length
    ? `Jhodge feat. ${currentTrack.features.join(", ")}`
    : "Jhodge";

  const muted = volume === 0;
  const cover = currentAlbum?.coverImage
    ? getAlbumCover(currentAlbum.coverImage, 400)
    : null;

  return (
    <AnimatePresence>
      {open && currentTrack ? (
        <motion.div
          key="full-screen-player"
          className="fixed inset-0 z-50 text-white"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 36 }}
          role="dialog"
          aria-modal="true"
          aria-label="Now playing"
        >
          {/* Shared blurred backdrop */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: currentAlbum?.bgColor ?? "#181818",
              backgroundImage: cover ? `url(${cover})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(40px)",
              transform: "scale(1.2)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.55)" }}
            aria-hidden
          />

          {/* ── MOBILE LAYOUT (hidden on md+) ── */}
          <motion.div
            className="relative z-10 flex h-full w-full flex-col px-6 pt-3 pb-8 md:hidden"
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={onDragEnd}
          >
            {/* Header: close + NOW PLAYING label */}
            <div className="flex items-center justify-between pb-4">
              <button
                ref={closeButtonRef}
                onClick={close}
                aria-label="Minimize player"
                className="-ml-2 flex h-10 w-10 items-center justify-center text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
              >
                <ChevronDown size={24} aria-hidden="true" />
              </button>
              <span className="font-[family-name:var(--font-bungee)] text-sm tracking-wide text-[#ffabef]">
                NOW PLAYING
              </span>
              <div className="w-10" />
            </div>

            {/* Album art */}
            <div className="flex flex-1 items-center justify-center py-4">
              <div
                className="relative aspect-square w-[80%] overflow-hidden rounded-2xl shadow-2xl"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  animation: "subtle-drift 20s ease-in-out infinite",
                }}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={`${currentAlbum?.title ?? currentTrack.title} album cover`}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music size={48} className="text-white/40" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>

            {/* Album context + title + artist */}
            <div className="pb-3">
              {currentAlbum && (
                <div className="mb-1 truncate font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.2em] text-white/50">
                  {currentAlbum.title}
                </div>
              )}
              <div className="truncate font-[family-name:var(--font-bungee)] text-2xl leading-tight text-[#dde4e2]">
                {currentTrack.title}
              </div>
              <div className="mt-1 truncate text-sm text-white/60">{features}</div>
            </div>

            {/* Buy Track + View Album */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="mb-4 flex flex-col items-center gap-3"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              >
                {currentTrack.price > 0 && (
                  <motion.button
                    onClick={handleBuyTrack}
                    aria-label={`Buy ${currentTrack.title} for $${currentTrack.price.toFixed(2)}`}
                    className="flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white"
                    style={{ background: "#62f3e4" }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <ShoppingBag size={16} aria-hidden="true" />
                    Buy Track · ${currentTrack.price.toFixed(2)}
                  </motion.button>
                )}
                {currentAlbum && (
                  <motion.button
                    onClick={handleViewAlbum}
                    aria-label={`View ${currentAlbum.title}`}
                    className="rounded-full border border-[#62f3e4] px-8 py-3 text-sm font-semibold text-[#62f3e4] transition-colors hover:bg-[#62f3e4]/10"
                    whileTap={{ scale: 0.96 }}
                  >
                    View Album →
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Seek bar */}
            <div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(e) => seekTo(Number(e.target.value))}
                disabled={!duration}
                aria-label="Seek"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={duration > 0 ? Math.round((currentTime / duration) * 100) : 0}
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                className="ntv-range h-1 w-full cursor-pointer accent-[#62f3e4]"
              />
              <div className="mt-1 flex items-center justify-between font-mono text-[11px] tabular-nums text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="mt-5 flex items-center justify-between">
              <motion.button
                onClick={toggleShuffle}
                aria-label="Shuffle"
                className="p-2"
                whileTap={{ scale: 0.92 }}
              >
                <Shuffle
                  size={20}
                  className={shuffle ? "text-[#62f3e4]" : "text-white/70"}
                />
              </motion.button>
              <motion.button
                onClick={previousAndPlay}
                aria-label="Previous track"
                className="p-2 text-white/90"
                whileTap={{ scale: 0.92 }}
              >
                <SkipBack size={28} fill="currentColor" />
              </motion.button>
              <motion.button
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#090f0e]"
                style={{ boxShadow: "0 0 24px rgba(255,255,255,0.25)" }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
              >
                {isPlaying ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" className="ml-1" />
                )}
              </motion.button>
              <motion.button
                onClick={nextAndPlay}
                aria-label="Next track"
                className="p-2 text-white/90"
                whileTap={{ scale: 0.92 }}
              >
                <SkipForward size={28} fill="currentColor" />
              </motion.button>
              <motion.button
                onClick={toggleRepeat}
                aria-label={`Repeat ${repeat}`}
                className="p-2"
                whileTap={{ scale: 0.92 }}
              >
                {repeat === "one" ? (
                  <Repeat1 size={20} className="text-[#62f3e4]" />
                ) : (
                  <Repeat
                    size={20}
                    className={repeat === "all" ? "text-[#62f3e4]" : "text-white/70"}
                  />
                )}
              </motion.button>
            </div>

            {/* Volume + queue */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setVolume(muted ? 0.7 : 0)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="text-white/70"
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(volume * 100)}
                aria-valuetext={`${Math.round(volume * 100)} percent`}
                className="ntv-range h-1 flex-1 cursor-pointer accent-[#62f3e4]"
              />
              <button
                aria-label={`Queue (${queueLen})`}
                className="ml-2 flex items-center gap-1 text-white/70"
              >
                <ListMusic size={18} />
                <span className="text-xs font-semibold tabular-nums">{queueLen}</span>
              </button>
            </div>
          </motion.div>

          {/* ── DESKTOP LAYOUT — centered art + huge Bungee title + side panels ── */}
          <div className="relative z-10 hidden h-full w-full md:flex items-center justify-center">
            {/* Close button */}
            <button
              ref={closeButtonRef}
              onClick={close}
              aria-label="Close player"
              className="absolute top-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
            >
              <X size={20} aria-hidden="true" />
            </button>

            {/* Left glass panel: volume */}
            <aside className="fixed left-8 top-1/2 -translate-y-1/2 z-20 hidden lg:flex">
              <div className="glass-panel rounded-xl p-4 flex flex-col items-center gap-4 w-14">
                <button
                  onClick={() => setVolume(muted ? 0.7 : 0)}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="text-[#bbcac6] hover:text-[#62f3e4] transition-colors"
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div className="h-36 w-1 bg-white/10 rounded-full relative flex flex-col justify-end">
                  <div
                    className="w-full bg-[#62f3e4] rounded-full transition-all"
                    style={{ height: `${Math.round(volume * 100)}%` }}
                    aria-hidden="true"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="sr-only"
                />
              </div>
            </aside>

            {/* Center: art + title + controls */}
            <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-8">
              {/* Album art */}
              <div
                className="w-[280px] h-[280px] lg:w-[320px] lg:h-[320px] rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 animate-drift"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={`${currentAlbum?.title ?? currentTrack.title} album cover`}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music size={64} className="text-white/40" aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Track title (huge Bungee) + artist */}
              <div className="text-center">
                {currentAlbum && (
                  <div className="mb-2 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.2em] text-white/50">
                    {currentAlbum.title}
                  </div>
                )}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="font-[family-name:var(--font-bungee)] text-5xl lg:text-7xl leading-none tracking-tight uppercase text-[#dde4e2]"
                  >
                    {currentTrack.title}
                  </motion.div>
                </AnimatePresence>
                <div className="mt-2 text-sm text-[#62f3e4] uppercase tracking-widest font-[family-name:var(--font-geist-mono)]">
                  {features}
                </div>
              </div>

              {/* Scrubber */}
              <div className="w-full max-w-lg">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  disabled={!duration}
                  aria-label="Seek"
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={duration > 0 ? Math.round((currentTime / duration) * 100) : 0}
                  aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                  className="ntv-range h-1 w-full cursor-pointer accent-[#62f3e4]"
                />
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] tabular-nums text-white/50">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Transport controls */}
              <div className="flex items-center gap-8">
                <motion.button onClick={toggleShuffle} aria-label="Shuffle" className="p-2" whileTap={{ scale: 0.92 }}>
                  <Shuffle size={22} className={shuffle ? "text-[#62f3e4]" : "text-white/50"} />
                </motion.button>
                <motion.button onClick={previousAndPlay} aria-label="Previous track" className="p-2 text-white/80" whileTap={{ scale: 0.92 }}>
                  <SkipBack size={32} fill="currentColor" />
                </motion.button>
                <motion.button
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#090f0e]"
                  style={{ boxShadow: "0 0 32px rgba(255,255,255,0.25)" }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                >
                  {isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </motion.button>
                <motion.button onClick={nextAndPlay} aria-label="Next track" className="p-2 text-white/80" whileTap={{ scale: 0.92 }}>
                  <SkipForward size={32} fill="currentColor" />
                </motion.button>
                <motion.button onClick={toggleRepeat} aria-label={`Repeat ${repeat}`} className="p-2" whileTap={{ scale: 0.92 }}>
                  {repeat === "one" ? (
                    <Repeat1 size={22} className="text-[#62f3e4]" />
                  ) : (
                    <Repeat size={22} className={repeat === "all" ? "text-[#62f3e4]" : "text-white/50"} />
                  )}
                </motion.button>
              </div>

              {/* Buy / View Album actions */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  {currentTrack.price > 0 && (
                    <motion.button
                      onClick={handleBuyTrack}
                      aria-label={`Buy ${currentTrack.title}`}
                      className="flex items-center gap-2 rounded-full px-6 py-2 text-sm font-bold text-[#003733]"
                      style={{ background: "#62f3e4" }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <ShoppingBag size={14} aria-hidden="true" />
                      Buy · ${currentTrack.price.toFixed(2)}
                    </motion.button>
                  )}
                  {currentAlbum && (
                    <motion.button
                      onClick={handleViewAlbum}
                      aria-label={`View ${currentAlbum.title}`}
                      className="rounded-full border border-white/20 px-6 py-2 text-sm text-white/70 transition-colors hover:border-[#62f3e4]/40 hover:text-[#62f3e4]"
                      whileTap={{ scale: 0.96 }}
                    >
                      View Album
                    </motion.button>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right glass panel: Up Next queue */}
            <aside className="fixed right-8 top-1/2 -translate-y-1/2 z-20 hidden lg:flex">
              <div className="glass-panel rounded-xl p-5 w-64 max-h-[420px] flex flex-col">
                <p className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[#b3b3b3] uppercase tracking-widest mb-3">
                  Up Next
                </p>
                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                  {queue.length > 1 ? (
                    queue
                      .filter((t) => t.id !== currentTrack?.id)
                      .slice(0, 8)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <div className="w-9 h-9 rounded overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center">
                            <Music size={12} className="text-white/40" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#dde4e2] truncate">{t.title}</p>
                            <p className="text-[10px] text-[#b3b3b3] uppercase tracking-wider truncate">Jhodge</p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-white/30 italic">No tracks queued</p>
                  )}
                </div>
                <button
                  className="mt-3 w-full py-2 rounded-lg text-[10px] font-[family-name:var(--font-geist-mono)] uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors border border-white/10 hover:border-white/20"
                  onClick={close}
                >
                  Open Full Queue
                </button>
              </div>
            </aside>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
