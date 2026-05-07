"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { albums } from "@/data/catalog";
import { AlbumCard } from "@/components/music/AlbumCard";
import { usePlayerStore } from "@/store/playerStore";

const PURPLE_SLUG = "nano-tech-purple";

const greetingForHour = (h: number) => {
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
};

const subscribeNoop = () => () => {};
const getClientGreeting = () => greetingForHour(new Date().getHours());
const getServerGreeting = () => "Welcome";

export default function HomePage() {
  const greeting = useSyncExternalStore(
    subscribeNoop,
    getClientGreeting,
    getServerGreeting,
  );

  const playAlbum = usePlayerStore((s) => s.playAlbum);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const featured = [...albums]
    .sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""))
    .slice(0, 6);

  const purple = albums.find((a) => a.slug === PURPLE_SLUG) ?? albums[0];

  return (
    <div className="px-6 pt-2 pb-12 md:px-8">
      <section className="pt-2 pb-6">
        <h1 className="text-3xl font-bold text-white md:text-4xl">{greeting}</h1>
      </section>

      <section className="pb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-white">Featured</h2>
        </div>
        <div className="-mx-6 overflow-x-auto px-6 md:-mx-8 md:px-8">
          <div className="flex gap-4 pb-2">
            {featured.map((album) => (
              <div key={album.id} className="w-[180px] flex-shrink-0">
                <AlbumCard
                  album={album}
                  size="md"
                  href={`/album/${album.slug}`}
                  showHoverPlay
                  onPlay={() => playAlbum(album)}
                />
                <div className="mt-2 truncate text-sm font-semibold text-white">
                  <Link href={`/album/${album.slug}`} className="hover:underline">
                    {album.title}
                  </Link>
                </div>
                <div className="text-xs text-[#B3B3B3]">
                  {album.releaseDate?.slice(0, 4) ?? ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-white">Latest Release</h2>
        </div>
        <div
          className="overflow-hidden rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${purple.bgColor} 0%, #1a0838 60%, #393838 100%)`,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8">
            <AlbumCard album={purple} size="lg" href={`/album/${purple.slug}`} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
                Latest Release
              </div>
              <h3 className="mb-2 text-3xl font-extrabold text-white md:text-5xl">
                {purple.title}
              </h3>
              <div className="mb-3 text-sm text-[#B3B3B3]">
                Jhodge ·{" "}
                {new Date(purple.releaseDate).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <p className="mb-5 line-clamp-2 max-w-2xl text-sm text-white/80">
                {purple.description}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => playAlbum(purple)}
                  disabled={!purple.tracks.length}
                  className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                  style={{ background: purple.accentColor }}
                >
                  <Play size={16} fill="currentColor" />
                  Play
                </button>
                <Link
                  href={`/album/${purple.slug}`}
                  className="flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  View Album
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-white">The Collection</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/album/${album.slug}`}
              className="group flex gap-4 rounded-md p-3 transition-colors hover:bg-white/5"
            >
              <AlbumCard
                album={album}
                size="md"
                showHoverPlay
                onPlay={() => playAlbum(album)}
              />
              <div className="min-w-0 flex-1 pt-2">
                <div className="truncate font-semibold text-white">{album.title}</div>
                <div className="text-xs text-[#B3B3B3]">
                  {album.releaseDate?.slice(0, 4)} · {album.tracks.length} songs
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-white/60">
                  {album.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {currentTrack ? (
        <section className="pb-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-white">Now Playing</h2>
          </div>
          <div
            className="flex items-center gap-4 rounded-xl p-4"
            style={{
              background: currentAlbum
                ? `linear-gradient(135deg, ${currentAlbum.bgColor} 0%, #393838 100%)`
                : "#282828",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {currentAlbum ? (
              <AlbumCard
                album={currentAlbum}
                size="md"
                href={`/album/${currentAlbum.slug}`}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B3B3B3]">
                Currently Playing
              </div>
              <div className="mt-1 truncate text-2xl font-bold text-white">
                {currentTrack.title}
              </div>
              <div className="text-sm text-[#B3B3B3]">
                Jhodge
                {currentTrack.features?.length
                  ? ` feat. ${currentTrack.features.join(", ")}`
                  : ""}
                {currentAlbum ? ` · ${currentAlbum.title}` : ""}
              </div>
              <button
                onClick={togglePlay}
                className="mt-3 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold text-black"
                style={{
                  background: currentAlbum?.accentColor ?? "#3DD6C8",
                }}
              >
                {isPlaying ? (
                  <>
                    <Pause size={14} fill="currentColor" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    Resume
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
