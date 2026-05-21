"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { AlbumCard } from "@/components/music/AlbumCard";
import { usePlayer } from "@/context/PlayerContext";
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
  const { playFromAlbum } = usePlayer();

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
      <div className="pb-4 pt-1 md:pt-2 md:pb-6">
        <h1 className="text-2xl font-bold text-white md:text-4xl">Library</h1>
        <p className="mt-1 text-sm text-[#B3B3B3]">
          {albums.length} releases · browse the full catalog
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                filter === opt.key
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="library-sort" className="text-xs text-[#B3B3B3]">
            Sort
          </label>
          <select
            id="library-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-[#3DD6C8]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-md border border-white/10 p-6 text-sm text-[#B3B3B3]">
          No releases match this filter.
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-5 lg:grid-cols-3"
          variants={containerStagger}
          initial="hidden"
          animate="visible"
        >
          {visible.map((album) => (
            <motion.div key={album.id} variants={itemFadeUp}>
              <Link
                href={`/album/${album.slug}`}
                className="group flex flex-col gap-2 rounded-md p-2 transition-colors hover:bg-white/5 md:flex-row md:gap-4 md:p-3"
              >
                <div
                  className="aspect-square w-full overflow-hidden rounded-md md:hidden"
                  style={{ background: album.bgColor }}
                >
                  {album.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAlbumCover(album.coverImage, "md")}
                      alt={album.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="hidden md:block">
                  <AlbumCard
                    album={album}
                    size="md"
                    showHoverPlay
                    onPlay={() => playFromAlbum(album)}
                  />
                </div>
                <div className="min-w-0 flex-1 md:pt-2">
                  <div className="truncate text-sm font-semibold text-white md:text-base">
                    {album.title}
                  </div>
                  <div className="text-xs text-[#B3B3B3]">
                    {album.releaseDate?.slice(0, 4) || "—"} · {album.trackCount}{" "}
                    {album.trackCount === 1 ? "song" : "songs"}
                  </div>
                  {sort === "most_played" && album.totalPlayCount > 0 ? (
                    <div className="mt-1 text-[11px] text-white/50">
                      {album.totalPlayCount.toLocaleString()} plays
                    </div>
                  ) : null}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
