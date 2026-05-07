"use client";

import Link from "next/link";
import { useState } from "react";
import {
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

  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const previousTrack = usePlayerStore((s) => s.previousTrack);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat);

  const [liked, setLiked] = useState(false);
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

  const features = currentTrack?.features?.length
    ? `Jhodge feat. ${currentTrack.features.join(", ")}`
    : "Jhodge";

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center px-4 text-white"
      style={{
        height: 90,
        background: "#181818",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex w-[30%] min-w-0 items-center gap-3">
        {currentTrack ? (
          <>
            {currentAlbum?.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentAlbum.coverImage}
                alt={currentAlbum.title}
                className="h-[60px] w-[60px] flex-shrink-0 rounded object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                }}
              />
            ) : (
              <div className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded bg-white/5">
                <Music size={20} className="text-white/40" />
              </div>
            )}
            <div className="min-w-0 flex-1">
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
            </div>
            <button
              onClick={() => setLiked((v) => !v)}
              aria-label={liked ? "Unlike" : "Like"}
              className="ml-2 flex-shrink-0 p-2 transition-colors"
            >
              <Heart
                size={18}
                className={liked ? "text-[#EB41DF]" : "text-[#B3B3B3] hover:text-white"}
                fill={liked ? "#EB41DF" : "none"}
              />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded bg-gradient-to-br from-[#3DD6C8] to-[#EB41DF]">
              <span className="font-mono text-xs font-bold text-black">NTP</span>
            </div>
            <div className="text-sm text-[#B3B3B3]">No track playing</div>
          </div>
        )}
      </div>

      <div className="flex w-[40%] flex-col items-center justify-center gap-1.5">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            aria-label="Shuffle"
            className="p-1 transition-colors"
          >
            <Shuffle
              size={16}
              className={shuffle ? "text-[#3DD6C8]" : "text-[#B3B3B3] hover:text-white"}
            />
          </button>
          <button
            onClick={previousTrack}
            aria-label="Previous track"
            disabled={!currentTrack}
            className="p-1 text-[#B3B3B3] transition-colors hover:text-white disabled:opacity-40"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!currentTrack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            onClick={nextTrack}
            aria-label="Next track"
            disabled={!currentTrack}
            className="p-1 text-[#B3B3B3] transition-colors hover:text-white disabled:opacity-40"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
          <button
            onClick={toggleRepeat}
            aria-label={`Repeat ${repeat}`}
            className="p-1 transition-colors"
          >
            {repeat === "one" ? (
              <Repeat1 size={16} className="text-[#3DD6C8]" />
            ) : (
              <Repeat
                size={16}
                className={repeat === "all" ? "text-[#3DD6C8]" : "text-[#B3B3B3] hover:text-white"}
              />
            )}
          </button>
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
            aria-label="Seek"
            className="h-1 flex-1 cursor-pointer accent-[#3DD6C8]"
          />
          <span className="font-mono text-[11px] tabular-nums text-[#B3B3B3]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="flex w-[30%] items-center justify-end gap-3">
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
          className="h-1 w-24 cursor-pointer accent-[#3DD6C8]"
        />
      </div>
    </footer>
  );
}
