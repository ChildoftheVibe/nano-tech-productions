import { getAlbumCover } from "@/lib/albumCover";
import type { Album } from "@/types/music";

/** Minimal, validated album shape fed to the Portal Room. Everything here is
 *  treated as untrusted DB input: colors must parse as hex, strings are
 *  length-capped, and albums without a usable cover are dropped. */
export type PortalAlbum = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  accentColor: string;
  bgColor: string;
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FALLBACK_ACCENT = "#62f3e4";
const FALLBACK_BG = "#090f0e";

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;
}

export function toPortalAlbums(albums: Album[]): PortalAlbum[] {
  if (!Array.isArray(albums)) return [];
  return albums
    .filter(
      (a): a is Album =>
        Boolean(a) &&
        typeof a.id === "string" &&
        a.id.length > 0 &&
        typeof a.title === "string" &&
        a.title.length > 0 &&
        typeof a.coverImage === "string" &&
        a.coverImage.length > 0,
    )
    .map((a) => ({
      id: a.id,
      slug: typeof a.slug === "string" && a.slug.length > 0 ? a.slug : a.id,
      title: a.title.slice(0, 120),
      coverUrl: getAlbumCover(a.coverImage, 1024),
      accentColor: safeColor(a.accentColor, FALLBACK_ACCENT),
      bgColor: safeColor(a.bgColor, FALLBACK_BG),
    }))
    .filter((a) => a.coverUrl.length > 0);
}
