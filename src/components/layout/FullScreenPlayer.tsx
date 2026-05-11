"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  ChevronDown,
  ListMusic,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlayer } from "@/context/PlayerContext";

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

  // Use the PlayerContext helpers so audio.play() runs synchronously in the
  // click handler and the user-gesture token survives.
  const { togglePlayPause, nextAndPlay, previousAndPlay } = usePlayer();
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

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) close();
  };

  const features = currentTrack?.features?.length
    ? `Jhodge feat. ${currentTrack.features.join(", ")}`
    : "Jhodge";

  const muted = volume === 0;
  const cover = currentAlbum?.coverImage;

  return (
    <AnimatePresence>
      {open && currentTrack ? (
        <motion.div
          key="full-screen-player"
          className="fixed inset-0 z-50 flex flex-col text-white md:hidden"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 36 }}
          drag="y"
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={onDragEnd}
          role="dialog"
          aria-modal="true"
          aria-label="Now playing"
        >
          {/* Blurred backdrop */}
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

          {/* Content */}
          <div className="relative z-10 flex h-full w-full flex-col px-6 pt-3 pb-8">
            {/* Drag handle + close */}
            <div className="flex items-center justify-between pb-2">
              <button
                onClick={close}
                aria-label="Minimize player"
                className="-ml-2 flex h-10 w-10 items-center justify-center text-white/80 hover:text-white"
              >
                <ChevronDown size={28} />
              </button>
              <div
                aria-hidden
                className="h-1 w-10 rounded-full bg-white/30"
              />
              <div className="w-10" />
            </div>

            {/* Album art */}
            <div className="flex flex-1 items-center justify-center py-6">
              <div
                className="relative aspect-square w-[60%] overflow-hidden rounded-2xl shadow-2xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={currentAlbum?.title ?? currentTrack.title}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music size={48} className="text-white/40" />
                  </div>
                )}
              </div>
            </div>

            {/* Title + artist */}
            <div className="pb-4">
              <div className="truncate text-2xl font-bold">{currentTrack.title}</div>
              <div className="mt-1 truncate text-sm text-white/70">{features}</div>
            </div>

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
                className="ntv-range h-1 w-full cursor-pointer accent-[#3DD6C8]"
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
                  className={shuffle ? "text-[#3DD6C8]" : "text-white/70"}
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
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black"
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
                  <Repeat1 size={20} className="text-[#3DD6C8]" />
                ) : (
                  <Repeat
                    size={20}
                    className={repeat === "all" ? "text-[#3DD6C8]" : "text-white/70"}
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
                className="ntv-range h-1 flex-1 cursor-pointer accent-[#3DD6C8]"
              />
              <button
                aria-label={`Queue (${queueLen})`}
                className="ml-2 flex items-center gap-1 text-white/70"
              >
                <ListMusic size={18} />
                <span className="text-xs font-semibold tabular-nums">{queueLen}</span>
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
