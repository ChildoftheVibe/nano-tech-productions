"use client";

import type { ReactNode } from "react";

/**
 * Optional CRT-cabinet framing around a canvas: soft accent-colored glow,
 * scanline texture, and a vignette. Purely decorative (aria-hidden), so it
 * never interferes with the canvas's own role/aria-label.
 */
export function RetroFrame({
  children,
  accent,
  scanlines = true,
  className = "",
}: {
  children: ReactNode;
  accent: string;
  scanlines?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`crt-frame relative inline-block overflow-hidden rounded-lg ${className}`}
      style={{ boxShadow: `0 0 24px ${accent}33, inset 0 0 32px rgba(0,0,0,0.55)` }}
    >
      {children}
      {scanlines && <div className="crt-scanlines pointer-events-none absolute inset-0" aria-hidden="true" />}
      <div className="crt-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}
