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
  /** Which /public/portals/vortex-<name>.webp plate this album's portal uses. */
  vortex: VortexName;
};

export type VortexName =
  | "blue"
  | "gray"
  | "green"
  | "noir"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "white";

/** Vortex energy overlay asset for a portal color. */
export const vortexAsset = (v: VortexName) => `/portals/vortex-${v}.webp`;

/** Chamber plate whose platform hue + light reflections match the portal
 *  color (recolored via Adobe Photoshop API). The three monochrome vortices
 *  share one desaturated chamber. */
export const chamberAsset = (v: VortexName) =>
  `/portals/chamber-${v === "gray" || v === "noir" || v === "white" ? "mono" : v}.webp`;

/** Hue anchors for the saturated vortex plates (sampled from the artwork). */
const VORTEX_HUES: Array<{ name: VortexName; hue: number }> = [
  { name: "red", hue: 0 },
  { name: "orange", hue: 30 },
  { name: "green", hue: 120 },
  { name: "blue", hue: 215 },
  { name: "purple", hue: 275 },
  { name: "pink", hue: 330 },
];

/** Map an album accent color to the closest-matching portal vortex plate.
 *  Low-saturation accents get the monochrome plates by lightness; everything
 *  else picks the nearest hue on the color wheel. */
export function nearestVortex(hex: string): VortexName {
  const r = parseInt(hex.length === 4 ? hex[1] + hex[1] : hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.length === 4 ? hex[2] + hex[2] : hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.length === 4 ? hex[3] + hex[3] : hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.18) return l > 0.72 ? "white" : l > 0.4 ? "noir" : "gray";
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  let best: VortexName = "blue";
  let bestDist = Infinity;
  for (const v of VORTEX_HUES) {
    const dist = Math.min(Math.abs(h - v.hue), 360 - Math.abs(h - v.hue));
    if (dist < bestDist) {
      bestDist = dist;
      best = v.name;
    }
  }
  return best;
}

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
    .map((a) => {
      const accentColor = safeColor(a.accentColor, FALLBACK_ACCENT);
      return {
        id: a.id,
        slug: typeof a.slug === "string" && a.slug.length > 0 ? a.slug : a.id,
        title: a.title.slice(0, 120),
        coverUrl: getAlbumCover(a.coverImage, 1024),
        accentColor,
        bgColor: safeColor(a.bgColor, FALLBACK_BG),
        vortex: nearestVortex(accentColor),
      };
    })
    .filter((a) => a.coverUrl.length > 0);
}
