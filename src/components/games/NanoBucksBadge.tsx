"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { useWalletStore } from "@/store/walletStore";

/** Live Nano Bucks balance pill. Links to the Nano Tech Games hub. */
export function NanoBucksBadge({ className = "" }: { className?: string }) {
  const balance = useWalletStore((s) => s.balance);
  const refresh = useWalletStore((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Link
      href="/games"
      aria-label={`Nano Bucks balance: ${balance ?? "loading"}. Open Nano Tech Games`}
      className={`flex min-h-8 items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#242b2a] px-3 py-1 text-xs font-semibold text-[#62f3e4] transition-all hover:border-[#62f3e4] teal-glow-hover ${className}`}
    >
      <Coins size={14} aria-hidden="true" />
      <span className="font-[family-name:var(--font-mono,monospace)] tabular-nums">
        {balance === null ? "…" : balance.toLocaleString()}
      </span>
      <span className="hidden text-[10px] tracking-wide text-[#bbcac6] sm:inline">NB</span>
    </Link>
  );
}
