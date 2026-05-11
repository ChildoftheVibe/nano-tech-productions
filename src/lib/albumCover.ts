const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const CLOUDINARY_HOST = "res.cloudinary.com";
const COVERS_FOLDER = "ntp/images/covers";

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
    const tail = input.slice(idx + marker.length).split("/");
    let i = 0;
    while (i < tail.length) {
      const seg = tail[i];
      if (/^v\d+$/.test(seg)) {
        i++;
        continue;
      }
      // Strip any existing transformation segment (e.g. "f_auto,q_auto").
      // Cloudinary transformations are sequences of `<key>_<value>` pairs and
      // never carry a file extension, so the extension test guards publicIds
      // that happen to start with two letters and an underscore.
      if (/^[a-z]{1,3}_[^/]+/i.test(seg) && !/\.[a-zA-Z0-9]+$/.test(seg)) {
        i++;
        continue;
      }
      break;
    }
    return `${input.slice(0, idx)}${marker}${transform}/${tail.slice(i).join("/")}`;
  }

  if (input.startsWith("/")) return input;

  const id = input.includes("/") ? input : `${COVERS_FOLDER}/${input}`;
  return `https://${CLOUDINARY_HOST}/${cloudName}/image/upload/${transform}/${id}`;
}
