"use client";

import { Gamepad2 } from "lucide-react";

/**
 * Branded loading placeholder shown while a lazy-loaded arcade game chunk
 * (or, for Star Vanguard / Vault Runner, the three.js/@react-three/fiber
 * bundle) is still downloading. Matches the game canvas footprint so layout
 * doesn't jump when the real component mounts.
 */
export function ArcadeSkeleton({ label = "Loading game" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#090f0e]"
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-40"
          style={{ background: "#62f3e4" }}
          aria-hidden="true"
        />
        <span
          className="relative flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "#12403a", boxShadow: "0 0 20px rgba(98,243,228,0.4)" }}
        >
          <Gamepad2 size={22} className="text-[#62f3e4]" aria-hidden="true" />
        </span>
      </div>
      <span className="text-[11px] font-semibold tracking-[0.08em] text-[#bbcac6] uppercase">
        {label}…
      </span>
    </div>
  );
}
