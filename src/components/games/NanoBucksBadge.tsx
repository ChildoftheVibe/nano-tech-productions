"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Coins } from "lucide-react";
import { useWalletStore } from "@/store/walletStore";

/**
 * Live Nano Bucks balance pill in the top bar. Links to the games hub, flashes
 * a "+N" chip whenever the balance rises (game win / redeem refund), and stays
 * fully keyboard-accessible with a visible focus ring.
 */
export function NanoBucksBadge({ className = "" }: { className?: string }) {
  const balance = useWalletStore((s) => s.balance);
  const refresh = useWalletStore((s) => s.refresh);
  const reduce = useReducedMotion();

  const prev = useRef<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Detect increases to surface an earn animation.
  useEffect(() => {
    if (balance === null) return;
    if (prev.current !== null && balance > prev.current) {
      const gained = balance - prev.current;
      setDelta(gained);
      const t = window.setTimeout(() => setDelta(null), 1600);
      prev.current = balance;
      return () => window.clearTimeout(t);
    }
    prev.current = balance;
  }, [balance]);

  const rising = delta !== null;

  return (
    <Link
      href="/games"
      aria-label={
        balance === null
          ? "Nano Bucks balance loading. Open Nano Tech Games"
          : `Nano Bucks balance: ${balance.toLocaleString()}. Open Nano Tech Games`
      }
      className={`group relative flex min-h-9 items-center gap-1.5 rounded-full border bg-[#242b2a] px-3 py-1 text-xs font-semibold text-[#62f3e4] transition-colors hover:border-[#62f3e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090f0e] ${
        rising ? "border-[#62f3e4]" : "border-[rgba(255,255,255,0.1)]"
      } ${className}`}
      style={rising ? { boxShadow: "0 0 18px rgba(98,243,228,0.45)" } : undefined}
    >
      <motion.span
        aria-hidden="true"
        animate={
          reduce || !rising
            ? { rotate: 0, scale: 1 }
            : { rotate: [0, -18, 14, 0], scale: [1, 1.25, 1] }
        }
        transition={{ duration: 0.6 }}
        className="flex text-[#62f3e4]"
      >
        <Coins size={14} />
      </motion.span>
      <span className="font-[family-name:var(--font-mono,monospace)] tabular-nums">
        {balance === null ? "…" : balance.toLocaleString()}
      </span>
      <span className="text-[10px] font-bold tracking-[0.12em] text-[#8fb8b1]">NB</span>

      {/* Earn flash: "+N" rising chip. aria-hidden — the balance label already
          carries the value for screen readers. */}
      <AnimatePresence>
        {rising && !reduce && (
          <motion.span
            key={delta}
            aria-hidden="true"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: -16 }}
            exit={{ opacity: 0, y: -26 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute -top-1 right-2 rounded-full bg-[#62f3e4] px-1.5 py-0.5 text-[10px] font-bold text-[#003733]"
          >
            +{delta?.toLocaleString()}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
