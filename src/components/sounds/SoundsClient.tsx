"use client";

import { useState } from "react";
import { Speaker } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PreviewPlayer } from "./PreviewPlayer";
import type { Instrumental, InstrumentalListResult } from "@/types/music";

type Props = {
  initial: InstrumentalListResult;
};

type Filter = "all" | "single" | "album_track";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "ALL" },
  { key: "single", label: "SINGLES" },
  { key: "album_track", label: "ALBUM TRACKS" },
];

export function SoundsClient({ initial }: Props) {
  const [items, setItems] = useState<Instrumental[]>(initial.instrumentals);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);

  const visible =
    filter === "all" ? items : items.filter((i) => i.type === filter);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const next = page + 1;
      const res = await fetch(`/api/instrumentals?page=${next}&limit=20`);
      if (!res.ok) return;
      const json = (await res.json()) as InstrumentalListResult;
      const known = new Set(items.map((i) => i.id));
      const additions = json.instrumentals.filter((i) => !known.has(i.id));
      setItems((prev) => [...prev, ...additions]);
      setHasMore(json.hasMore);
      setPage(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-2 pb-12 md:px-8">
      <header className="pt-1 pb-6">
        <h1
          className="font-mono text-3xl font-extrabold tracking-wider text-white md:text-5xl"
          style={{ letterSpacing: "0.06em" }}
        >
          SOUNDS
        </h1>
        <div
          className="mt-2 h-[3px] w-12 rounded-full"
          style={{ background: "#3DD6C8" }}
          aria-hidden="true"
        />
        <p className="mt-3 text-sm text-[#B3B3B3]">Instrumentals by Jhodge</p>
      </header>

      <div
        role="tablist"
        aria-label="Filter instrumentals by type"
        className="mb-6 flex flex-wrap gap-2"
      >
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3DD6C8] ${
                active
                  ? "bg-[#3DD6C8] text-black"
                  : "border border-white/15 text-[#B3B3B3] hover:border-white/30 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Speaker size={24} aria-hidden="true" />}
          title="No instrumentals yet"
          message={
            items.length === 0
              ? "Check back soon — Jhodge is dropping new sounds regularly."
              : `No ${filter === "single" ? "singles" : "album tracks"} match this filter.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((instrumental) => (
            <PreviewPlayer key={instrumental.id} instrumental={instrumental} />
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-white/20 bg-black/20 px-6 py-2 text-sm font-semibold text-white hover:bg-black/40 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load More"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
