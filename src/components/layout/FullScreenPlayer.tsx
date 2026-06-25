"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  AlignJustify,
  User,
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
  // All accent-driven colors derive from this single variable.
  const accent =
    currentAlbum?.accentColor ?? "#62f3e4";
  // Play button: use accent; falls back to teal when no album loaded.
  const playAccent = accent;

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
          {/* Accent color bleed from bottom — gives the background the album's color temperature */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 110%, ${accent}28 0%, transparent 65%)`,
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.52)" }}
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
              <div className="font-[family-name:var(--font-bungee)] text-4xl leading-tight tracking-tight uppercase text-[#dde4e2] break-words">
                {currentTrack.title}
              </div>
              <div className="mt-1.5 truncate font-[family-name:var(--font-geist-mono)] text-sm" style={{ color: accent }}>{features}</div>
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
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      borderRadius: 8, padding: "12px 22px",
                      fontSize: 11, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      background: "transparent", cursor: "pointer",
                      border: `1px solid ${accent}`, color: accent,
                    }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <ShoppingBag size={14} aria-hidden="true" />
                    Buy Track · ${currentTrack.price.toFixed(2)}
                  </motion.button>
                )}
                {currentAlbum && (
                  <motion.button
                    onClick={handleViewAlbum}
                    aria-label={`View ${currentAlbum.title}`}
                    style={{
                      borderRadius: 8, padding: "12px 22px",
                      fontSize: 11, fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      background: "transparent", cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.20)",
                      color: "rgba(255,255,255,0.65)",
                    }}
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
                style={{ accentColor: accent }}
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
                  style={{ color: shuffle ? accent : undefined }}
                  className={shuffle ? undefined : "text-white/70"}
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
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: playAccent, color: "#0d1412", boxShadow: `0 0 24px ${playAccent}40` }}
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
                  <Repeat1 size={20} style={{ color: accent }} />
                ) : (
                  <Repeat
                    size={20}
                    style={{ color: repeat === "all" ? accent : undefined }}
                    className={repeat === "all" ? undefined : "text-white/70"}
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
                style={{ accentColor: accent }}
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

          {/* ── DESKTOP LAYOUT ── */}
          <div className="relative z-10 hidden h-full w-full md:flex flex-col">

            {/* Top nav bar */}
            <header className="flex items-center justify-between px-8 py-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <AlignJustify size={18} className="text-white/60" aria-hidden="true" />
                <span className="font-[family-name:var(--font-bungee)] text-base tracking-tight text-[#dde4e2]">
                  NTV VAULT
                </span>
              </div>
              <nav className="flex items-center gap-1" aria-label="Site navigation">
                <Link
                  href="/"
                  onClick={close}
                  className="px-4 py-1.5 text-sm text-[#bbcac6] hover:text-white transition-colors"
                >
                  Home
                </Link>
                <span className="text-white/20 text-sm">|</span>
                <span className="px-4 py-1.5 text-sm font-semibold" style={{ color: accent }}>
                  Now Playing
                </span>
                <span className="text-white/20 text-sm">|</span>
                <Link
                  href="/library"
                  onClick={close}
                  className="px-4 py-1.5 text-sm text-[#bbcac6] hover:text-white transition-colors"
                >
                  Library
                </Link>
              </nav>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <User size={14} className="text-white/70" aria-hidden="true" />
                </div>
                <button
                  ref={closeButtonRef}
                  onClick={close}
                  aria-label="Close player"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* Main content: left vol + center + right queue */}
            <div className="flex flex-1 items-center min-h-0 px-8 gap-6">

              {/* Left: vertical volume panel */}
              <aside className="hidden lg:flex flex-col items-center gap-4 w-14 flex-shrink-0 self-center">
                <div className="glass-panel rounded-xl p-4 flex flex-col items-center gap-4 w-14">
                  <button
                    onClick={() => setVolume(muted ? 0.7 : 0)}
                    aria-label={muted ? "Unmute" : "Mute"}
                    className="text-[#bbcac6] hover:text-white transition-colors"
                  >
                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  {/* Vertical slider track */}
                  <div className="relative h-36 w-1 rounded-full bg-white/10 flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full rounded-full transition-all duration-150"
                      style={{ height: `${Math.round(volume * 100)}%`, background: accent }}
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
                  <VolumeX size={14} className="text-white/20" aria-hidden="true" />
                </div>
              </aside>

              {/* Center: art + title + scrubber + controls */}
              <div className="flex flex-col items-center gap-5 flex-1 min-w-0 py-4">
                {/* Album art */}
                <div
                  className="w-[260px] h-[260px] lg:w-[300px] lg:h-[300px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 animate-drift"
                  style={{
                    background: currentAlbum?.bgColor ?? "rgba(255,255,255,0.05)",
                    boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)`,
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
                      <Music size={64} className="text-white/30" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Track title + artist • album */}
                <div className="text-center w-full max-w-xl">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTrack.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <h1 className="font-[family-name:var(--font-bungee)] text-5xl lg:text-6xl leading-none tracking-tight uppercase text-[#dde4e2] break-words">
                        {currentTrack.title}
                      </h1>
                      <p className="mt-3 text-sm uppercase tracking-widest font-[family-name:var(--font-geist-mono)]">
                        <span style={{ color: accent }}>{features}</span>
                        {currentAlbum && (
                          <>
                            <span className="mx-2 text-white/30">•</span>
                            <span className="text-[#bbcac6]">{currentAlbum.title}</span>
                          </>
                        )}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Scrubber with flanking timestamps */}
                <div className="flex items-center gap-3 w-full max-w-lg">
                  <span className="font-mono text-[11px] tabular-nums text-white/50 w-8 text-right flex-shrink-0">
                    {formatTime(currentTime)}
                  </span>
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
                    className="ntv-range h-1 flex-1 cursor-pointer accent-[#62f3e4]"
                    style={{ accentColor: accent }}
                  />
                  <span className="font-mono text-[11px] tabular-nums text-white/50 w-8 flex-shrink-0">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Transport controls */}
                <div className="flex items-center gap-7">
                  <motion.button
                    onClick={toggleShuffle}
                    aria-label="Shuffle"
                    className="p-2"
                    whileTap={{ scale: 0.92 }}
                  >
                    <Shuffle size={20} style={{ color: shuffle ? accent : undefined, transition: "color 150ms" }} className={shuffle ? undefined : "text-white/40 hover:text-white/70"} />
                  </motion.button>
                  <motion.button
                    onClick={previousAndPlay}
                    aria-label="Previous track"
                    className="p-2 text-white/70 hover:text-white"
                    style={{ transition: "color 150ms" }}
                    whileTap={{ scale: 0.92 }}
                  >
                    <SkipBack size={28} fill="currentColor" />
                  </motion.button>
                  <motion.button
                    onClick={togglePlayPause}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="flex h-[72px] w-[72px] items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      background: playAccent,
                      color: "#003733",
                      boxShadow: `0 0 32px ${playAccent}60`,
                    }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {isPlaying ? (
                      <Pause size={30} fill="currentColor" />
                    ) : (
                      <Play size={30} fill="currentColor" className="ml-1" />
                    )}
                  </motion.button>
                  <motion.button
                    onClick={nextAndPlay}
                    aria-label="Next track"
                    className="p-2 text-white/70 hover:text-white"
                    style={{ transition: "color 150ms" }}
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
                      <Repeat1 size={20} style={{ color: accent }} />
                    ) : (
                      <Repeat size={20} style={{ color: repeat === "all" ? accent : undefined, transition: "color 150ms" }} className={repeat === "all" ? undefined : "text-white/40 hover:text-white/70"} />
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
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          borderRadius: 8, padding: "10px 18px",
                          fontSize: 11, fontWeight: 600,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                          background: "transparent", cursor: "pointer",
                          border: `1px solid ${accent}`, color: accent,
                        }}
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
                        style={{
                          borderRadius: 8, padding: "10px 18px",
                          fontSize: 11, fontWeight: 600,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                          background: "transparent", cursor: "pointer",
                          border: "1px solid rgba(255,255,255,0.20)",
                          color: "rgba(255,255,255,0.60)",
                        }}
                        whileTap={{ scale: 0.96 }}
                      >
                        View Album
                      </motion.button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right: Up Next queue panel */}
              <aside className="hidden lg:flex flex-col flex-shrink-0 self-center">
                <div className="glass-panel rounded-xl p-5 w-64 max-h-[480px] flex flex-col">
                  <p className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[#b3b3b3] uppercase tracking-widest mb-4">
                    Up Next
                  </p>
                  <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                    {queue.length > 1 ? (
                      queue
                        .filter((t) => t.id !== currentTrack?.id)
                        .slice(0, 8)
                        .map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer group transition-colors hover:bg-white/[0.04]"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
                              {currentAlbum?.coverImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={getAlbumCover(currentAlbum.coverImage, 40)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Music size={14} className="text-white/30" aria-hidden="true" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#dde4e2] truncate group-hover:text-white transition-colors">
                                {t.title}
                              </p>
                              <p className="text-[10px] text-[#b3b3b3] truncate mt-0.5">
                                {t.features?.length ? `Jhodge feat. ${t.features.join(", ")}` : "Jhodge"}
                              </p>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-white/30 italic py-2">No tracks queued</p>
                    )}
                  </div>
                  <button
                    className="mt-4 w-full py-2 rounded-lg text-[10px] font-[family-name:var(--font-geist-mono)] uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors border border-white/10 hover:border-white/20"
                    onClick={close}
                  >
                    Open Full Queue
                  </button>
                </div>
              </aside>

            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
