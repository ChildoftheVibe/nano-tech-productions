"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  Download,
} from "lucide-react";
import { getDownloadToken, saveDownloadToken } from '@/lib/downloadTokens'
import { usePlayerStore } from "@/store/playerStore";
import { usePlayer } from "@/context/PlayerContext";
import { getAlbumCover } from "@/lib/albumCover";
import { usePathname } from 'next/navigation'
import PlayerWaveform from '@/components/layout/PlayerWaveform'

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
  const isMuted = usePlayerStore((s) => s.isMuted);
  const toggleMuteStore = usePlayerStore((s) => s.toggleMute);

  const showLyricsButton = !!currentTrack?.has_lyrics;

  const [liked, setLiked] = useState(false);
  const [likedPulse, setLikedPulse] = useState(0);
  const [prevVolume, setPrevVolume] = useState(0.7);

  const pathname = usePathname()
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const handleVisibility = () => {
      setIsHidden(document.visibilityState === 'hidden')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const albumPagePattern = /^\/album\//
  const isOnAlbumPage = albumPagePattern.test(pathname)
  const hasNavigatedAway = currentTrack != null && !isOnAlbumPage
  const showWaveform = isHidden || hasNavigatedAway
  const isSingle = currentAlbum?.album_type === 'single'
  const accentColor = currentAlbum?.accentColor ?? null
  // Play button takes the current album cover's accent; teal when no cover.
  const playAccent =
    currentAlbum?.coverImage && currentAlbum.accentColor
      ? currentAlbum.accentColor
      : "#62f3e4"

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

  const [dlToken, setDlToken] = useState<string | null>(null)
  const [showDlInput, setShowDlInput] = useState(false)
  const [tokenInput, setTokenInput] = useState('')

  useEffect(() => {
    if (!currentTrack?.id) return
    setDlToken(getDownloadToken(currentTrack.id))
    setShowDlInput(false)
    setTokenInput('')
  }, [currentTrack?.id])

  const handleSaveToken = () => {
    if (!currentTrack?.id || !tokenInput.trim()) return
    saveDownloadToken(currentTrack.id, tokenInput.trim())
    setDlToken(tokenInput.trim())
    setShowDlInput(false)
    setTokenInput('')
  }

  const touchStartY = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY
    if (delta > 40) {
      openFullScreen()
    }
  }

  return (
    <footer
      className="relative flex-shrink-0 min-h-14 text-white"
      style={{
        background: "#090f0e",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Music player"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
        className="ntv-range absolute inset-x-0 top-0 z-10 h-1 w-full cursor-pointer accent-[#62f3e4] md:hidden"
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
                  src={getAlbumCover(currentAlbum.coverImage, 40)}
                  alt={currentAlbum.title}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-white/5">
                  <Music size={20} className="text-white/40" />
                </div>
              )}
            </button>
            {showWaveform && currentTrack != null ? (
              <div className="min-w-0 flex-1 text-left h-8 overflow-hidden">
                <PlayerWaveform
                  isPlaying={isPlaying}
                  accentColor={accentColor}
                  isSingle={isSingle}
                />
              </div>
            ) : (
              <button
                onClick={openFullScreen}
                aria-label="Open full-screen player"
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate text-xs font-medium text-white">
                  {currentTrack.title}
                </div>
                <div className="truncate text-xs text-[#B3B3B3]">{features}</div>
              </button>
            )}
            <motion.button
              onClick={togglePlayPause}
              aria-label={playLabel}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: playAccent, color: "#0d1412", boxShadow: `0 0 15px ${playAccent}4d` }}
              whileTap={{ scale: 0.92 }}
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" className="ml-0.5" />
              )}
            </motion.button>
            {showLyricsButton ? (
              <motion.button
                onClick={toggleLyrics}
                aria-label={lyricsLabel}
                aria-pressed={lyricsOpen}
                className="flex-shrink-0 p-2"
                style={{
                  color: lyricsOpen ? "#62f3e4" : "#B3B3B3",
                  filter: lyricsOpen ? "drop-shadow(0 0 6px rgba(98,243,228,0.6))" : "none",
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
              <SkipForward size={16} fill="currentColor" />
            </motion.button>
          </>
        ) : (
          <div className="flex w-full items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-to-br from-[#62f3e4] to-[#ffabef]">
              <span className="font-mono text-xs font-bold text-black">NTV</span>
            </div>
            <div className="text-sm text-[#B3B3B3]">No track playing</div>
          </div>
        )}
      </div>

      {/* Desktop layout — clicking dead space opens full-screen player */}
      <div
        className="hidden h-full items-center px-4 md:flex cursor-pointer"
        onClick={openFullScreen}
        role="button"
        aria-label="Open Now Playing"
        tabIndex={-1}
      >
        <div className="flex w-[30%] min-w-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
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
                      src={getAlbumCover(currentAlbum.coverImage, 40)}
                      alt={currentAlbum.title}
                      className="h-10 w-10 flex-shrink-0 rounded object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility =
                          "hidden";
                      }}
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-white/5">
                      <Music size={20} className="text-white/40" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              {showWaveform && currentTrack != null ? (
                <div className="min-w-0 flex-1 overflow-hidden h-8">
                  <PlayerWaveform
                    isPlaying={isPlaying}
                    accentColor={accentColor}
                    isSingle={isSingle}
                  />
                </div>
              ) : (
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
                          className="block truncate text-xs font-medium text-white hover:underline"
                        >
                          {currentTrack.title}
                        </Link>
                      ) : (
                        <div className="truncate text-xs font-medium text-white">
                          {currentTrack.title}
                        </div>
                      )}
                      <div className="truncate text-xs text-[#B3B3B3]">{features}</div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
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
                      liked ? "text-[#ffabef]" : "text-[#B3B3B3] hover:text-white"
                    }
                    fill={liked ? "#ffabef" : "none"}
                  />
                </motion.span>
              </motion.button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-to-br from-[#62f3e4] to-[#ffabef]">
                <span className="font-mono text-xs font-bold text-black">NTV</span>
              </div>
              <div className="text-sm text-[#B3B3B3]">No track playing</div>
            </div>
          )}
        </div>

        <div className="flex w-[40%] flex-col items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4">
            <motion.button
              onClick={toggleShuffle}
              aria-label="Shuffle"
              className="p-1 transition-colors"
              whileTap={{ scale: 0.92 }}
            >
              <Shuffle
                size={16}
                className={shuffle ? "text-[#62f3e4]" : "text-[#B3B3B3] hover:text-white"}
              />
            </motion.button>
            <motion.button
              onClick={previousAndPlay}
              aria-label="Previous track"
              disabled={!currentTrack}
              className="p-1 text-[#B3B3B3] transition-colors hover:text-white disabled:opacity-40"
              whileTap={{ scale: 0.92 }}
            >
              <SkipBack size={16} fill="currentColor" />
            </motion.button>
            <motion.button
              onClick={togglePlayPause}
              aria-label={playLabel}
              disabled={!currentTrack}
              className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-40"
            style={{ background: playAccent, color: "#0d1412", boxShadow: `0 0 15px ${playAccent}4d` }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.15 }}
            >
              {isPlaying ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" className="ml-0.5" />
              )}
            </motion.button>
            <motion.button
              onClick={nextAndPlay}
              aria-label="Next track"
              disabled={!currentTrack}
              className="p-1 text-[#B3B3B3] transition-colors hover:text-white disabled:opacity-40"
              whileTap={{ scale: 0.92 }}
            >
              <SkipForward size={16} fill="currentColor" />
            </motion.button>
            <motion.button
              onClick={toggleRepeat}
              aria-label={`Repeat ${repeat}`}
              className="p-1 transition-colors"
              whileTap={{ scale: 0.92 }}
            >
              {repeat === "one" ? (
                <Repeat1 size={16} className="text-[#62f3e4]" />
              ) : (
                <Repeat
                  size={16}
                  className={
                    repeat === "all" ? "text-[#62f3e4]" : "text-[#B3B3B3] hover:text-white"
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
              className="ntv-range h-1 flex-1 cursor-pointer accent-[#62f3e4]"
            />
            <span className="font-mono text-[11px] tabular-nums text-[#B3B3B3]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex w-[30%] items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
          {showLyricsButton ? (
            <motion.button
              onClick={toggleLyrics}
              aria-label={lyricsLabel}
              aria-pressed={lyricsOpen}
              title="Lyrics"
              className="p-2 transition-colors"
              style={{
                color: lyricsOpen ? "#62f3e4" : "#B3B3B3",
                filter: lyricsOpen ? "drop-shadow(0 0 6px rgba(98,243,228,0.6))" : "none",
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
            onClick={toggleMuteStore}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="p-2 text-[#B3B3B3] transition-colors hover:text-white"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
            className="ntv-range h-1 w-24 cursor-pointer accent-[#62f3e4]"
          />
          {currentTrack?.price != null && Number(currentTrack.price) > 0 && (
            <div className="relative">
              {dlToken ? (
                <a
                  href={`/api/download/${dlToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded text-[#62f3e4] hover:bg-white/[0.08] transition-colors block"
                  aria-label="Download track"
                >
                  <Download size={16} />
                </a>
              ) : (
                <button
                  onClick={() => setShowDlInput((v) => !v)}
                  className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
                  aria-label="Download track"
                >
                  <Download size={16} />
                </button>
              )}
              {showDlInput && !dlToken && (
                <div className="absolute bottom-10 right-0 w-64 bg-[#282828] border border-white/10 rounded-lg p-3 shadow-xl z-50">
                  <p className="text-xs text-white/60 mb-2 leading-relaxed">
                    Paste your download token from your purchase email:
                  </p>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Enter token..."
                    className="w-full bg-white/[0.06] border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/30 mb-2 focus:outline-none focus:border-[#62f3e4]/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveToken}
                      className="flex-1 text-xs py-1 bg-[#62f3e4] text-[#003733] rounded font-medium hover:bg-[#62f3e4]/90 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowDlInput(false)}
                      className="px-2 text-xs text-white/50 hover:text-white/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
