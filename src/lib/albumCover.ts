const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const CLOUDINARY_HOST = "res.cloudinary.com";
const COVERS_FOLDER = "ntp/images/covers";
const COVER_VIDEOS_FOLDER = "ntp/video/covers";

export type AlbumCoverSize = "sm" | "md" | "lg" | number;

const SIZE_PX: Record<Exclude<AlbumCoverSize, number>, number> = {
  sm: 80,
  md: 300,
  lg: 400,
};

// 1×1 teal PNG (#3DD6C8) used as the blur placeholder for album covers so cards
// flash a brand color instead of white while the real image streams in.
export const ALBUM_COVER_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOwvXYCAAMvAdzxGouZAAAAAElFTkSuQmCC";

/**
 * Build an optimized Cloudinary delivery URL for an album cover. Accepts a
 * bare publicId, an already-baked Cloudinary URL, or a local /assets path
 * (which is returned as-is). Cloudinary applies f_auto / q_auto:good and a
 * c_fill crop at the requested size so browsers receive a right-sized
 * WebP/AVIF on a single CDN hop.
 *
 * Client-safe — pulls from NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, no secrets.
 */
export function getAlbumCover(
  input: string,
  size: AlbumCoverSize = "md",
): string {
  if (!input) return "";
  const w = typeof size === "number" ? size : SIZE_PX[size];
  const transform = `f_auto,q_auto:good,w_${w},h_${w},c_fill`;

  if (/^https?:\/\//.test(input)) {
    const marker = "/image/upload/";
    const idx = input.indexOf(marker);
    if (idx < 0) return input;
    const head = input.slice(0, idx + marker.length);
    const tail = input.slice(idx + marker.length);
    // If the URL already carries an f_/q_/w_/h_/c_ transform segment, leave it
    // alone — splicing in a second transform produces an unresolvable URL.
    if (/^(?:[a-z]_[^/]+,)*[a-z]_[^/]+\//.test(tail)) return input;
    return `${head}${transform}/${tail}`;
  }

  if (input.startsWith("/")) return input;

  const id = input.includes("/") ? input : `${COVERS_FOLDER}/${input}`;
  return `https://${CLOUDINARY_HOST}/${cloudName}/image/upload/${transform}/${id}`;
}

/**
 * Build an optimized Cloudinary delivery URL for a full-bleed hero image.
 * Width-only resize (no square crop — heroes are wide) with f_auto/q_auto so
 * phones get a right-sized WebP/AVIF instead of the multi-MB original PNG.
 * Accepts a full Cloudinary URL or a bare publicId; other URLs pass through.
 *
 * Client-safe — pulls from NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, no secrets.
 */
export function getHeroImage(input: string, width = 1600): string {
  if (!input) return "";
  const transform = `f_auto,q_auto:good,w_${width}`;

  if (/^https?:\/\//.test(input)) {
    const marker = "/image/upload/";
    const idx = input.indexOf(marker);
    if (idx < 0) return input;
    const head = input.slice(0, idx + marker.length);
    const tail = input.slice(idx + marker.length);
    // Already carries a transform segment — leave it alone, same as getAlbumCover.
    if (/^(?:[a-z]_[^/]+,)*[a-z]_[^/]+\//.test(tail)) return input;
    return `${head}${transform}/${tail}`;
  }

  if (input.startsWith("/")) return input;

  return `https://${CLOUDINARY_HOST}/${cloudName}/image/upload/${transform}/${input}`;
}

/**
 * Build an optimized Cloudinary delivery URL for a looping cover video. Accepts
 * a bare publicId, an already-baked Cloudinary URL, or a local path (returned
 * as-is). Cloudinary applies q_auto and a square c_fill crop at the requested
 * size and delivers MP4 (H.264) so the `<video>` element streams a right-sized,
 * widely-supported clip on a single CDN hop. Mirrors getAlbumCover so cover
 * videos honor the same bandwidth discipline as cover images.
 *
 * Client-safe — pulls from NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, no secrets.
 */
export function getCoverVideo(
  input: string,
  size: AlbumCoverSize = "lg",
): string {
  if (!input) return "";
  const w = typeof size === "number" ? size : SIZE_PX[size];
  const transform = `q_auto,w_${w},h_${w},c_fill,f_mp4,vc_h264`;

  if (/^https?:\/\//.test(input)) {
    const marker = "/video/upload/";
    const idx = input.indexOf(marker);
    if (idx < 0) return input;
    const head = input.slice(0, idx + marker.length);
    const tail = input.slice(idx + marker.length);
    // Leave URLs that already carry a transform segment untouched — splicing a
    // second transform in produces an unresolvable URL.
    if (/^(?:[a-z]{1,2}_[^/]+,)*[a-z]{1,2}_[^/]+\//.test(tail)) return input;
    return `${head}${transform}/${tail}`;
  }

  if (input.startsWith("/")) return input;

  const id = input.includes("/") ? input : `${COVER_VIDEOS_FOLDER}/${input}`;
  return `https://${CLOUDINARY_HOST}/${cloudName}/video/upload/${transform}/${id}`;
}
