"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

export function TopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // TODO: /search route doesn't exist yet — submitting will 404 until added.
  const goSearch = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goSearch();
          }}
          className="flex h-9 items-center gap-2 rounded-full px-4 py-2 transition-colors duration-150"
          style={{
            background: "#181818",
            border: searchFocused
              ? "1px solid #3DD6C8"
              : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Search
            size={16}
            className={searchFocused ? "text-[#3DD6C8]" : "text-[#B3B3B3]"}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search"
            className="w-40 bg-transparent text-sm text-white placeholder-[#B3B3B3] outline-none sm:w-56"
            aria-label="Search"
          />
        </form>
        <motion.div
          whileHover={{
            scale: 1.03,
            boxShadow: "0 0 12px rgba(235,65,223,0.4)",
          }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{ borderRadius: 9999 }}
        >
          <Link
            href="/admin"
            className="inline-flex h-9 items-center justify-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
            style={{ background: "#EB41DF" }}
          >
            Admin
          </Link>
        </motion.div>
      </div>
    </header>
  );
}
