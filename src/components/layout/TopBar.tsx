"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";

export function TopBar() {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-20 flex h-14 flex-shrink-0 items-center justify-between gap-4 px-4"
      style={{
        background:
          "linear-gradient(to bottom, rgba(9,15,14,0.85), rgba(9,15,14,0.3) 70%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Mobile: NTV brand wordmark (hidden on desktop where sidebar shows it) */}
      <Link
        href="/"
        aria-label="NTV Vault home"
        className="ntv-logo font-[family-name:var(--font-bungee)] text-[20px] tracking-tighter text-[#62f3e4] leading-none md:hidden"
      >
        NTV
      </Link>

      {/* Desktop: back/forward nav */}
      <div className="hidden md:flex items-center gap-2">
        <motion.button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          whileTap={{ scale: 0.88 }}
        >
          <ChevronLeft size={20} />
        </motion.button>
        <motion.button
          onClick={() => router.forward()}
          aria-label="Go forward"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          whileTap={{ scale: 0.88 }}
        >
          <ChevronRight size={20} />
        </motion.button>
      </div>

      <div className="flex items-center gap-3">
        <SearchBar mode="navigate" />
        {/* Avatar / profile pill */}
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, #62f3e4 0%, #ffabef 100%)" }}
          aria-hidden="true"
        >
          <span className="font-[family-name:var(--font-bungee)] text-[10px] font-bold text-[#003733]">NTV</span>
        </div>
      </div>
    </header>
  );
}
