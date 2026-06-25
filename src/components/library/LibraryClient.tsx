"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import type { LibraryAlbum } from "@/lib/queries";
import { getAlbumCover } from "@/lib/albumCover";

type Sort = "newest" | "oldest" | "az" | "most_played";
type Filter = "all" | "albums" | "singles";

const SORT_OPTIONS: Array<{ key: Sort; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "az", label: "A–Z" },
  { key: "most_played", label: "Most Played" },
];

const FILTER_OPTIONS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "albums", label: "Albums" },
  { key: "singles", label: "Singles" },
];

const containerStagger: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemFadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

const compareDate = (a: string, b: string) => {
  // Empty release_date sorts last regardless of direction.
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
};

export function LibraryClient({ albums }: { albums: LibraryAlbum[] }) {
  const [sort, setSort] = useState<Sort>("newest");
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => {
    const filtered = albums.filter((a) => {
      if (filter === "all") return true;
      if (filter === "singles") return a.trackCount === 1;
      return a.trackCount > 1;
    });
    const sorted = [...filtered];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => compareDate(b.releaseDate, a.releaseDate));
        break;
      case "oldest":
        sorted.sort((a, b) => compareDate(a.releaseDate, b.releaseDate));
        break;
      case "az":
        sorted.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
        );
        break;
      case "most_played":
        sorted.sort((a, b) => b.totalPlayCount - a.totalPlayCount);
        break;
    }
    return sorted;
  }, [albums, sort, filter]);

  return (
    <div className="px-4 pt-2 pb-12 md:px-8">
      <div className="pb-6 pt-2 md:pt-4 md:pb-8">
        <h1 className="font-[family-name:var(--font-bungee)] text-4xl text-[#62f3e4] tracking-tight uppercase leading-none md:text-6xl lg:text-7xl">
          YOUR COLLECTION
        </h1>
        <p className="mt-2 text-sm text-[#bbcac6] md:text-base">
          Curated experiences and saved moments.
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-widest text-[#bbcac6]/50">
          {albums.length} releases · browse the full catalog
        </p>
      </div>

      {/* Tab bar — border-b-2 active indicator per 2027 design spec */}
      <div className="mb-6 border-b border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-xl">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={`pb-3 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest transition-all duration-150 border-b-2 -mb-px ${
                  filter === opt.key
                    ? "border-[#62f3e4] text-[#62f3e4]"
                    : "border-transparent text-[#bbcac6] hover:text-[#dde4e2]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pb-3">
            <label htmlFor="library-sort" className="text-xs text-[#B3B3B3]">
              Sort
            </label>
            <select
              id="library-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-semibold text-white outline-none focus:border-[#62f3e4]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-md border border-white/10 p-6 text-sm text-[#B3B3B3]">
          No releases match this filter.
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          variants={containerStagger}
          initial="hidden"
          animate="visible"
        >
          {visible.map((album) => (
            <motion.div key={album.id} variants={itemFadeUp}>
              <Link
                href={`/album/${album.slug}`}
                className="glass-card rounded-xl p-4 group cursor-pointer block"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                  {album.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAlbumCover(album.coverImage, "md")}
                      alt={album.title}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ background: album.bgColor }}
                    />
                  )}
                </div>
                <div className="font-semibold text-[#dde4e2] truncate mb-1">
                  {album.title}
                </div>
                <div className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[#b3b3b3] uppercase tracking-wider">
                  {album.releaseDate?.slice(0, 4) || "—"} · {album.trackCount}{" "}
                  {album.trackCount === 1 ? "song" : "songs"}
                </div>
                {sort === "most_played" && album.totalPlayCount > 0 ? (
                  <div className="mt-1 text-[11px] text-white/50">
                    {album.totalPlayCount.toLocaleString()} plays
                  </div>
                ) : null}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
