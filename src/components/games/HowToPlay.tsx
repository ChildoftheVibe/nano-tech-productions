"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HelpCircle, ListOrdered, Sparkles, Target, X, Gamepad2 } from "lucide-react";
import type { GameGuide } from "./guides";

/** Desktop/tablet: full explanation rendered directly below the active game
 *  in neat glass-panel containers. Hidden on mobile (`md:hidden` counterpart
 *  is HowToPlayButton). Both read from the same GameGuide so copy never
 *  drifts between breakpoints. */
export function HowToPlayPanels({
  guide,
  accent = "#62f3e4",
}: {
  guide: GameGuide | null;
  accent?: string;
}) {
  if (!guide) return null;
  return (
    <div className="mt-6 hidden gap-4 md:grid md:grid-cols-2">
      <section className="glass-panel flex flex-col gap-2 rounded-xl p-4">
        <h3
          className="flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] uppercase"
          style={{ color: accent }}
        >
          <Target size={13} aria-hidden="true" /> Objective
        </h3>
        <p className="text-sm text-[#dde4e2]">{guide.objective}</p>
      </section>

      <section className="glass-panel flex flex-col gap-2 rounded-xl p-4">
        <h3
          className="flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] uppercase"
          style={{ color: accent }}
        >
          <ListOrdered size={13} aria-hidden="true" /> How to Play
        </h3>
        <ol className="list-decimal space-y-1 pl-4 text-sm text-[#dde4e2]">
          {guide.howToPlay.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {guide.controls && guide.controls.length > 0 && (
        <section className="glass-panel flex flex-col gap-2 rounded-xl p-4">
          <h3
            className="flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] uppercase"
            style={{ color: accent }}
          >
            <Gamepad2 size={13} aria-hidden="true" /> Controls
          </h3>
          <dl className="space-y-1.5 text-sm">
            {guide.controls.map((c, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 rounded bg-[#242b2a] px-1.5 py-0.5 text-[11px] font-mono text-[#bbcac6]">
                  {c.keys}
                </dt>
                <dd className="text-right text-[#dde4e2]">{c.action}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="glass-panel flex flex-col gap-2 rounded-xl p-4">
        <h3
          className="flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] uppercase"
          style={{ color: accent }}
        >
          <Sparkles size={13} aria-hidden="true" /> Tips &amp; Payouts
        </h3>
        <ul className="list-disc space-y-1 pl-4 text-sm text-[#dde4e2]">
          {guide.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Mobile: a compact "How to play" button (hidden md:hidden's desktop
 *  counterpart panels take over above `md`) that opens an accessible
 *  bottom-sheet dialog. Mirrors the dialog pattern used by CheckoutModal:
 *  role="dialog", aria-modal, a labelled title, backdrop click + Escape to
 *  close, and focus moved into the sheet on open / returned to the trigger
 *  button on close. */
export function HowToPlayButton({
  guide,
  accent = "#62f3e4",
}: {
  guide: GameGuide | null;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  if (!guide) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f0e]"
        style={{ borderColor: `${accent}55`, color: accent }}
      >
        <HelpCircle size={13} aria-hidden="true" /> How to play
      </button>
      <AnimatePresence>
        {open && (
          <HowToPlaySheet
            guide={guide}
            accent={accent}
            onClose={() => setOpen(false)}
            returnFocusTo={triggerRef}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function HowToPlaySheet({
  guide,
  accent,
  onClose,
  returnFocusTo,
}: {
  guide: GameGuide;
  accent: string;
  onClose: () => void;
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const reduce = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape closes; focus enters the sheet on mount and returns to the
  // trigger button on unmount.
  useEffect(() => {
    const triggerEl = returnFocusTo.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
      triggerEl?.focus?.();
    };
  }, [onClose, returnFocusTo]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center md:hidden"
      style={{ background: "rgba(0,0,0,0.75)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-[rgba(255,255,255,0.1)] bg-[#1a2120]"
        initial={reduce ? { opacity: 0 } : { y: "100%" }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        exit={reduce ? { opacity: 0 } : { y: "100%" }}
        transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 32 }}
      >
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
          <h2
            id="how-to-play-title"
            className="flex items-center gap-1.5 font-[family-name:var(--font-bungee)] text-sm tracking-tight"
            style={{ color: accent }}
          >
            <HelpCircle size={15} aria-hidden="true" /> How to Play
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close how to play"
            className="rounded-full p-1.5 text-[#bbcac6] hover:bg-white/10 hover:text-[#dde4e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-1.5">
              <h3
                className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase"
                style={{ color: accent }}
              >
                <Target size={12} aria-hidden="true" /> Objective
              </h3>
              <p className="text-sm text-[#dde4e2]">{guide.objective}</p>
            </section>

            <section className="flex flex-col gap-1.5">
              <h3
                className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase"
                style={{ color: accent }}
              >
                <ListOrdered size={12} aria-hidden="true" /> How to Play
              </h3>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-[#dde4e2]">
                {guide.howToPlay.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>

            {guide.controls && guide.controls.length > 0 && (
              <section className="flex flex-col gap-1.5">
                <h3
                  className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase"
                  style={{ color: accent }}
                >
                  <Gamepad2 size={12} aria-hidden="true" /> Controls
                </h3>
                <dl className="space-y-1.5 text-sm">
                  {guide.controls.map((c, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 rounded bg-[#242b2a] px-1.5 py-0.5 text-[11px] font-mono text-[#bbcac6]">
                        {c.keys}
                      </dt>
                      <dd className="text-right text-[#dde4e2]">{c.action}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="flex flex-col gap-1.5 pb-2">
              <h3
                className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase"
                style={{ color: accent }}
              >
                <Sparkles size={12} aria-hidden="true" /> Tips &amp; Payouts
              </h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-[#dde4e2]">
                {guide.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
