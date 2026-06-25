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
    <div className="px-6 pt-6 pb-16 md:px-8 md:pt-8">

      {/* Heading */}
      <div className="mb-8">
        <h1
          className="font-[family-name:var(--font-bungee)] uppercase leading-none tracking-tight"
          style={{ fontSize: "clamp(2.5rem,6vw,4.5rem)", color: "#62f3e4" }}
        >
          Nano Tech Vault
        </h1>
      </div>

      {/* Tab bar + Sort */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 32 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                style={{
                  paddingBottom: 14,
                  marginBottom: -1,
                  fontSize: 13,
                  fontWeight: filter === opt.key ? 600 : 400,
                  color: filter === opt.key ? "#dde4e2" : "#b3b3b3",
                  background: "none",
                  border: "none",
                  borderBottom: filter === opt.key ? "2px solid #62f3e4" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "color 150ms ease-out",
                  letterSpacing: "0.01em",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pb-3">
            <label htmlFor="library-sort" style={{ fontSize: 12, color: "#b3b3b3" }}>
              Sort
            </label>
            <select
              id="library-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#dde4e2",
                outline: "none",
                cursor: "pointer",
              }}
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

      {/* Grid */}
      {visible.length === 0 ? (
        <div
          style={{
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: 24,
            fontSize: 14,
            color: "#b3b3b3",
          }}
        >
          No releases match this filter.
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          style={{ gap: 24 }}
          variants={containerStagger}
          initial="hidden"
          animate="visible"
        >
          {visible.map((album) => (
            <motion.div key={album.id} variants={itemFadeUp}>
              <Link
                href={`/album/${album.slug}`}
                className="group block"
                style={{ textDecoration: "none" }}
              >
                {/* Cover art */}
                <div
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 12,
                    background: album.bgColor || "#1a2120",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  {album.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAlbumCover(album.coverImage, "md")}
                      alt={album.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>

                {/* Metadata */}
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#dde4e2",
                    margin: "0 0 4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  className="group-hover:text-white transition-colors"
                >
                  {album.title}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 11,
                    color: "#b3b3b3",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    margin: 0,
                  }}
                >
                  {album.releaseDate?.slice(0, 4) || "—"} · {album.trackCount}{" "}
                  {album.trackCount === 1 ? "track" : "tracks"}
                </p>
                {sort === "most_played" && album.totalPlayCount > 0 ? (
                  <p style={{ marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                    {album.totalPlayCount.toLocaleString()} plays
                  </p>
                ) : null}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
