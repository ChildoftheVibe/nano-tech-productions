"use client";

import type { PointerEventHandler, ReactNode } from "react";

/**
 * Shared, WCAG-compliant chrome for the arcade cabinet games:
 *  - Touch controls meet the 44×44px target minimum (WCAG 2.5.5).
 *  - Every control has a visible focus ring and an aria-label.
 *  - A polite live region announces score / win / loss to screen readers,
 *    since the play surfaces themselves are <canvas> or dense grids.
 */

const PAD_BASE =
  "flex h-12 w-16 touch-none select-none items-center justify-center rounded-xl border border-[rgba(255,255,255,0.15)] bg-[#242b2a] text-xl text-[#dde4e2] transition-colors active:bg-[#2f3635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:opacity-40";

/** A tap control (fire, rotate, drop). */
export function PadButton({
  label,
  onPress,
  children,
  disabled,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button type="button" aria-label={label} onClick={onPress} disabled={disabled} className={PAD_BASE}>
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

/** A hold control (move left / right) that fires on press and releases. */
export function HoldButton({
  label,
  onHoldChange,
  children,
}: {
  label: string;
  onHoldChange: (held: boolean) => void;
  children: ReactNode;
}) {
  const down: PointerEventHandler = () => onHoldChange(true);
  const up: PointerEventHandler = () => onHoldChange(false);
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      className={PAD_BASE}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

/** Screen-reader status line + visible objective/result text. */
export function ArcadeStatus({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "win" | "lose";
}) {
  const color = tone === "win" ? "#62f3e4" : tone === "lose" ? "#ff8a8a" : "#bbcac6";
  return (
    <p
      aria-live={tone === "info" ? "polite" : "assertive"}
      className={
        tone === "info"
          ? "text-xs"
          // Arcade HUD moment: the win/lose banner is the one place the 8-bit
          // display font shows up, mirroring a classic "GAME OVER" screen.
          : "font-[family-name:var(--font-arcade)] text-[11px] leading-relaxed tracking-tight"
      }
      style={{ color, textShadow: tone !== "info" ? `0 0 10px ${color}66` : undefined }}
    >
      {children}
    </p>
  );
}
