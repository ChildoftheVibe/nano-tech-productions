"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Heart,
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

export function PlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);

  const lyricsOpen = usePlayerStore((s) => s.lyricsOpen);

  // Autoplay policy requires audio.play() to run synchronously inside the
  // click handler — bound through PlayerContext, not the store, so the
  // helpers can hit the audio element directly.
  const { togglePlayPause, nextAndPlay, previousAndPlay } = usePlayer();
  const setVolume = usePlayerStore((s) => s.setVolume);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat);
  const openFullScreen = usePlayerStore((s) => s.openFullScreen);
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics);

  const showLyricsButton = !!currentTrack?.has_lyrics;

  const [liked, setLiked] = useState(false);
  const [likedPulse, setLikedPulse] = useState(0);
  const [prevVolume, setPrevVolume] = useState(0.7);

  const muted = volume === 0;
  const toggleMute = () => {
    if (muted) {
      setVolume(prevVolume || 0.7);
    } else {
      setPrevVolume(volume);
      setVolume(0);
    }
  };

  const handleLike = () => {
    setLiked((v) => !v);
    setLikedPulse((n) => n + 1);
  };

  const features = currentTrack?.features?.length
    ? `Jhodge feat. ${currentTrack.features.join(", ")}`
    : "Jhodge";

  const trackName = currentTrack?.title;
  const playLabel = trackName
    ? isPlaying
      ? `Pause ${trackName}`
      : `Play ${trackName}`
    : isPlaying
      ? "Pause"
      : "Play";
  const lyricsLabel = trackName ? `View lyrics for ${trackName}` : "View lyrics";

  // Global keyboard shortcuts. Skip when the user is typing or interacting
  // with another widget so this never steals input from forms, sliders, or
  // contenteditable surfaces.
  useEffect(() => {
    const shouldIgnore = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (shouldIgnore(e.target)) return;
      if (!currentTrack) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekTo(Math.min(duration || 0, currentTime + 10));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekTo(Math.max(0, currentTime - 10));
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (volume === 0) {
          setVolume(prevVolume || 0.7);
        } else {
          setPrevVolume(volume);
          setVolume(0);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    currentTrack,
    togglePlayPause,
    seekTo,
    setVolume,
    duration,
    currentTime,
    volume,
    prevVolume,
  ]);

  const percentPlayed = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer
      className="relative flex-shrink-0 text-white"
      style={{
        height: 90,
        background: "#181818",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
      aria-label="Music player"
    >
      {/* Mobile: full-width thin progress bar at very top */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(e) => seekTo(Number(e.target.value))}
        disabled={!duration}
        aria-label="Track progress"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percentPlayed)}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        className="ntv-range absolute inset-x-0 top-0 z-10 h-1 w-full cursor-pointer accent-[#3DD6C8] md:hidden"
      />

      {/* Mobile single-row layout */}
      <div className="flex h-full items-center gap-3 px-3 pt-1 md:hidden">
        {currentTrack ? (
          <>
            <button
              onClick={openFullScreen}
              aria-label="Open full-screen player"
              className="flex-shrink-0"
            >
              {currentAlbum?.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAlbum.coverImage}
                  alt={currentAlbum.title}
                  className="h-[60px] w-[60px] rounded object-cover"
                />
              ) : (
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded bg-white/5">
                  <Music size={20} className="text-white/40" />
                </div>
              )}
            </button>
            <button
              onClick={openFullScreen}
              aria-label="Open full-screen player"
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-sm font-medium text-white">
                {currentTrack.title}
              </div>
              <div className="truncate text-xs text-[#B3B3B3]">{features}</div>
            </button>
            <motion.button
              onClick={togglePlayPause}
              aria-label={playLabel}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-black"
              whileTap={{ scale: 0.92 }}
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </motion.button>
            {showLyricsButton ? (
              <motion.button
                onClick={toggleLyrics}
                aria-label={lyricsLabel}
                aria-pressed={lyricsOpen}
                className="flex-shrink-0 p-2"
                style={{
                  color: lyricsOpen ? "#3DD6C8" : "#B3B3B3",
                  filter: lyricsOpen ? "drop-shadow(0 0 6px rgba(61,214,200,0.6))" : "none",
                }}
                whileTap={{ scale: 0.92 }}
              >
                <BookOpen size={20} />
              </motion.button>
            ) : null}
            <motion.button
              onClick={nextAndPlay}
              aria-label="Next track"
              className="flex-shrink-0 p-2 text-[#B3B3B3]"
              whileTap={{ scale: 0.92 }}
            >
              <SkipForward size={20} fill="currentColor" />
            </motion.button>
          </>
        ) : (
          <div className="flex w-full items-center gap-3">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded bg-gradient-to-br from-[#3DD6C8] to-[#EB41DF]">
              <span className="font-mono text-xs font-bold text-black">NTV</span>
            </div>
            <div className="text-sm text-[#B3B3B3]">No track playing</div>
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden h-full items-center px-4 md:flex">
        <div className="flex w-[30%] min-w-0 items-center gap-3">
          {currentTrack ? (
            <>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  {currentAlbum?.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentAlbum.coverImage}
                      alt={currentAlbum.title}
                      className="h-[60px] w-[60px] flex-shrink-0 rounded object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility =
                          "hidden";
                      }}
                    />
                  ) : (
                    <div className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded bg-white/5">
                      <Music size={20} className="text-white/40" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="min-w-0 flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    {currentAlbum ? (
                      <Link
                        href={`/album/${currentAlbum.id}`}
                        className="block truncate text-sm font-medium text-white hover:underline"
                      >
                        {currentTrack.title}
                      </Link>
                    ) : (
                      <div className="truncate text-sm font-medium text-white">
                        {currentTrack.title}
                      </div>
                    )}
                    <div className="truncate text-xs text-[#B3B3B3]">{features}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <motion.button
                onClick={handleLike}
                aria-label={liked ? "Unlike" : "Like"}
                className="ml-2 flex-shrink-0 p-2 transition-colors"
                whileTap={{ scale: 0.92 }}
                animate={{ scale: 1 }}
                key={likedPulse}
                initial={false}
              >
                <motion.span
                  key={likedPulse}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="block"
                >
                  <Heart
                    size={18}
                    className={
                      liked ? "text-[#EB41DF]" : "text-[#B3B3B3] hover:text-white"
                    }
                    fill={liked ? "#EB41DF" : "none"}
                  />
                </motion.span>
              </motion.button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded bg-gradient-to-br from-[#3DD6C8] to-[#EB41DF]">
                <span className="font-mono text-xs font-bold text-black">NTV</span>
              </div>
              <div className="text-sm text-[#B3B3B3]">No track playing</div>
            </div>
          )}
        </div>

        <div className="flex w-[40%] flex-col items-center justify-center gap-1.5">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={toggleShuffle}
              aria-label="Shuffle"
              className="p-1 transition-colors"
              whileTap={{ scale: 0.92 }}
            >
              <Shuffle
                size={16}
                className={shuffle ? "text-[#3DD6C8]" : "text-[#B3B3B3] hover:text-white"}
              />
            </motion.button>
            <motion.button
              onClick={previousAndPlay}
              aria-label="Previous track"
              disabled={!currentTrack}
              className="p-1 text-[#B3B3B3] transition-colors hover:text-white disabled:opacity-40"
              whileTap={{ scale: 0.92 }}
            >
              <SkipBack size={20} fill="currentColor" />
            </motion.button>
            <motion.button
              onClick={togglePlayPause}
              aria-label={playLabel}
              disabled={!currentTrack}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.15 }}
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </motion.button>
            <motion.button
              onClick={nextAndPlay}
              aria-label="Next track"
              disabled={!currentTrack}
              className="p-1 text-[#B3B3B3] transition-colors hover:text-white disabled:opacity-40"
              whileTap={{ scale: 0.92 }}
            >
              <SkipForward size={20} fill="currentColor" />
            </motion.button>
            <motion.button
              onClick={toggleRepeat}
              aria-label={`Repeat ${repeat}`}
              className="p-1 transition-colors"
              whileTap={{ scale: 0.92 }}
            >
              {repeat === "one" ? (
                <Repeat1 size={16} className="text-[#3DD6C8]" />
              ) : (
                <Repeat
                  size={16}
                  className={
                    repeat === "all" ? "text-[#3DD6C8]" : "text-[#B3B3B3] hover:text-white"
                  }
                />
              )}
            </motion.button>
          </div>

          <div className="flex w-full items-center gap-2">
            <span className="font-mono text-[11px] tabular-nums text-[#B3B3B3]">
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
              aria-label="Track progress"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percentPlayed)}
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
              className="ntv-range h-1 flex-1 cursor-pointer accent-[#3DD6C8]"
            />
            <span className="font-mono text-[11px] tabular-nums text-[#B3B3B3]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex w-[30%] items-center justify-end gap-3">
          {showLyricsButton ? (
            <motion.button
              onClick={toggleLyrics}
              aria-label={lyricsLabel}
              aria-pressed={lyricsOpen}
              title="Lyrics"
              className="p-2 transition-colors"
              style={{
                color: lyricsOpen ? "#3DD6C8" : "#B3B3B3",
                filter: lyricsOpen ? "drop-shadow(0 0 6px rgba(61,214,200,0.6))" : "none",
              }}
              whileTap={{ scale: 0.92 }}
            >
              <BookOpen size={18} />
            </motion.button>
          ) : null}
          <button
            aria-label="Queue"
            className="p-2 text-[#B3B3B3] transition-colors hover:text-white"
          >
            <ListMusic size={18} />
          </button>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="p-2 text-[#B3B3B3] transition-colors hover:text-white"
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
            className="ntv-range h-1 w-24 cursor-pointer accent-[#3DD6C8]"
          />
        </div>
      </div>
    </footer>
  );
}
