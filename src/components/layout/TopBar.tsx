"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";

export function TopBar() {
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-20 flex h-14 flex-shrink-0 items-center justify-between gap-4 px-4"
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.1) 70%, transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-2">
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
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{ borderRadius: 9999 }}
        >
          <Link
            href="/fan-club/login"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#3DD6C8]/25 px-5 py-1 text-xs font-semibold tracking-wide text-[#3DD6C8]/80 transition-colors hover:border-[#3DD6C8]/50 hover:text-[#3DD6C8]"
            style={{ background: "rgba(61,214,200,0.06)" }}
          >
            <Users size={12} aria-hidden="true" />
            Nano Techians
          </Link>
        </motion.div>
      </div>
    </header>
  );
}
