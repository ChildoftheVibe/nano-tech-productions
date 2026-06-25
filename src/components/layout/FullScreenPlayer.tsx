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
            {/* Drag handle + close */}
            <div className="flex items-center justify-between pb-2">
              <button
                ref={closeButtonRef}
                onClick={close}
                aria-label="Minimize player"
                className="-ml-2 flex h-10 w-10 items-center justify-center text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
              >
                <ChevronDown size={28} aria-hidden="true" />
              </button>
              <div
                aria-hidden
                className="h-1 w-10 rounded-full bg-white/40"
              />
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
              <div className="truncate font-[family-name:var(--font-bungee)] text-2xl leading-tight text-[#62f3e4]">
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
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#62f3e4] text-[#003733]"
                style={{ boxShadow: "0 0 24px rgba(98, 243, 228, 0.4)" }}
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

          {/* ── DESKTOP LAYOUT (hidden below md) ── */}
          <div className="relative z-10 hidden h-full w-full md:flex">
            {/* Close button */}
            <button
              ref={closeButtonRef}
              onClick={close}
              aria-label="Close player"
              className="absolute top-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
            >
              <X size={20} aria-hidden="true" />
            </button>

            {/* Left panel: art + track info + action buttons */}
            <div className="w-1/2 flex flex-col items-center justify-center p-12 gap-8">
              <div
                className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-2xl"
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
                    <Music size={64} className="text-white/40" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="text-center">
                {currentAlbum && (
                  <div className="mb-1 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.2em] text-white/50">
                    {currentAlbum.title}
                  </div>
                )}
                <div className="font-[family-name:var(--font-bungee)] text-3xl text-[#62f3e4]">
                  {currentTrack.title}
                </div>
                <div className="mt-1 text-sm text-white/60">{features}</div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col items-center gap-3"
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
            </div>

            {/* Right panel: controls */}
            <div className="w-1/2 flex flex-col p-12 gap-6 justify-center">
              {/* Progress bar + time */}
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
                <div className="mt-2 flex items-center justify-between font-mono text-[12px] tabular-nums text-white/70">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Transport controls */}
              <div className="flex items-center justify-between">
                <motion.button
                  onClick={toggleShuffle}
                  aria-label="Shuffle"
                  className="p-2"
                  whileTap={{ scale: 0.92 }}
                >
                  <Shuffle
                    size={24}
                    className={shuffle ? "text-[#62f3e4]" : "text-white/70"}
                  />
                </motion.button>
                <motion.button
                  onClick={previousAndPlay}
                  aria-label="Previous track"
                  className="p-2 text-white/90"
                  whileTap={{ scale: 0.92 }}
                >
                  <SkipBack size={32} fill="currentColor" />
                </motion.button>
                <motion.button
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-[#62f3e4] text-[#003733]"
                  style={{ boxShadow: "0 0 32px rgba(98, 243, 228, 0.4)" }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                >
                  {isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </motion.button>
                <motion.button
                  onClick={nextAndPlay}
                  aria-label="Next track"
                  className="p-2 text-white/90"
                  whileTap={{ scale: 0.92 }}
                >
                  <SkipForward size={32} fill="currentColor" />
                </motion.button>
                <motion.button
                  onClick={toggleRepeat}
                  aria-label={`Repeat ${repeat}`}
                  className="p-2"
                  whileTap={{ scale: 0.92 }}
                >
                  {repeat === "one" ? (
                    <Repeat1 size={24} className="text-[#62f3e4]" />
                  ) : (
                    <Repeat
                      size={24}
                      className={repeat === "all" ? "text-[#62f3e4]" : "text-white/70"}
                    />
                  )}
                </motion.button>
              </div>

              {/* Volume slider */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setVolume(muted ? 0.7 : 0)}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="text-white/70"
                >
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
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
              </div>

              {/* Queue info */}
              <div className="flex items-center gap-2 text-white/50">
                <ListMusic size={18} />
                <span className="text-sm">
                  {queueLen} track{queueLen !== 1 ? "s" : ""} in queue
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
