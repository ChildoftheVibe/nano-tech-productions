"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSfx } from "./sfx";

/** Small persisted SFX mute toggle, meant to sit alongside each game's
 *  touch-control row. 44px target, matches the ArcadeControls pad styling. */
export function MuteToggle() {
  const { muted, toggleMuted } = useSfx();
  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-pressed={muted}
      aria-label={muted ? "Sound effects muted. Tap to unmute." : "Sound effects on. Tap to mute."}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.15)] bg-[#242b2a] text-[#dde4e2] transition-colors active:bg-[#2f3635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17]"
    >
      {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
    </button>
  );
}
