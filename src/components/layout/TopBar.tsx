"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

export function TopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

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
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => router.forward()}
          aria-label="Go forward"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goSearch();
          }}
          className="flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Search size={16} className="text-[#B3B3B3]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-40 bg-transparent text-sm text-white placeholder-[#B3B3B3] outline-none sm:w-56"
            aria-label="Search"
          />
        </form>
        <Link
          href="/admin"
          className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
          style={{ background: "#EB41DF" }}
        >
          Admin
        </Link>
      </div>
    </header>
  );
}
