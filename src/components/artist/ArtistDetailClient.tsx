"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";
import { AlbumCard } from "@/components/music/AlbumCard";
import { ArtistHero } from "./ArtistHero";
import type { Album, Artist, ArtistTrack, Track } from "@/types/music";

const ROLE_LABEL: Record<string, string> = {
  primary: "Primary",
  featured: "Featured",
  producer: "Producer",
  songwriter: "Writer",
  engineer: "Engineer",
};

function artistTrackToTrack(t: ArtistTrack): Track {
  return {
    id: t.id,
    albumId: t.albumId,
    title: t.title,
    trackNumber: t.trackNumber,
    duration: t.duration,
    price: t.price,
    features: t.features,
    audioUrl: t.audioUrl,
    credits: {},
    lyrics: null,
    has_lyrics: false,
    // Carry album art/theme through so the player swaps cover + accent
    albumSlug: t.albumSlug ?? undefined,
    albumTitle: t.albumTitle ?? undefined,
    albumCoverImage: t.albumCoverImage ?? undefined,
    albumBgColor: t.albumBgColor ?? undefined,
    albumAccentColor: t.albumAccentColor ?? undefined,
  };
}

export function ArtistDetailClient({ artist }: { artist: Artist }) {
  const { playFromTrack, playAlbumBySlug } = usePlayer();
  const albums = artist.albums ?? [];
  const tracks = artist.tracks ?? [];

  const handlePlay = (t: ArtistTrack) => {
    if (!t.audioUrl) return;
    // No full Album object here; the track carries embedded album metadata,
    // so playTrack derives cover + accent from it via albumFromTrack.
    playFromTrack(artistTrackToTrack(t), null);
  };

  return (
    <div className="pb-12 text-white">
      <ArtistHero artist={artist} />

      {albums.length > 0 ? (
        <section className="px-4 pt-10 md:px-8">
          <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-[0.25em] text-white">
            Appears On
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {albums.map((a) => {
              const albumForCard: Album = {
                id: a.id,
                slug: a.slug,
                title: a.title,
                description: "",
                releaseDate: a.releaseDate,
                coverImage: a.coverImage,
                bgColor: a.bgColor,
                accentColor: a.accentColor,
                spotifyUrl: "",
                tracks: [],
              };
              return (
                <div key={a.id} className="flex flex-col">
                  <AlbumCard
                    album={albumForCard}
                    size="md"
                    href={`/album/${a.slug}`}
                    showHoverPlay
                    onPlay={() => void playAlbumBySlug(a.slug)}
                  />
                  <div className="mt-2 truncate text-sm font-semibold text-white">
                    <Link href={`/album/${a.slug}`} className="hover:underline">
                      {a.title}
                    </Link>
                  </div>
                  <div className="text-xs text-[#B3B3B3]">
                    {a.releaseDate?.slice(0, 4) ?? ""}
                    {a.artistRole && ROLE_LABEL[a.artistRole]
                      ? ` · ${ROLE_LABEL[a.artistRole]}`
                      : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tracks.length > 0 ? (
        <section className="px-4 pt-10 md:px-8">
          <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-[0.25em] text-white">
            Tracks
          </h2>
          <ul className="space-y-1">
            {tracks.map((t) => (
              <li key={t.id}>
                <motion.button
                  type="button"
                  onClick={() => handlePlay(t)}
                  disabled={!t.audioUrl}
                  whileTap={{ scale: 0.99 }}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-white/5 disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
                    <Play size={14} fill="currentColor" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">
                      {t.title}
                    </div>
                    <div className="truncate text-xs text-[#B3B3B3]">
                      {t.albumTitle ? (
                        t.albumSlug ? (
                          <Link
                            href={`/album/${t.albumSlug}`}
                            className="hover:text-[#62f3e4]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.albumTitle}
                          </Link>
                        ) : (
                          t.albumTitle
                        )
                      ) : null}
                      {t.artistRole && ROLE_LABEL[t.artistRole]
                        ? ` · ${ROLE_LABEL[t.artistRole]}`
                        : ""}
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-xs text-[#B3B3B3]">
                    {t.duration}
                  </span>
                </motion.button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
