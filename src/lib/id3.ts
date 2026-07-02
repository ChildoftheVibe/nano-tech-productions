import "server-only";

import { getAlbumCover } from "./albumCover";
import { logError } from "./logger";

/**
 * Minimal ID3v2.3 tag writer so purchased MP3 downloads carry the album
 * cover (APIC) plus title/artist/album metadata. Cloudinary's f_mp3
 * transcode strips tags, so the download routes proxy the file through
 * here instead of redirecting the browser straight to the CDN.
 *
 * ID3v2.3 (not v2.4) because it has the widest player support.
 */

export type Id3Meta = {
  title?: string;
  artist?: string;
  album?: string;
  trackNumber?: number;
  image?: { mime: string; data: Buffer };
};

/** 28-bit synchsafe integer (7 bits per byte) used by the tag header. */
function synchsafe(n: number): Buffer {
  return Buffer.from([
    (n >>> 21) & 0x7f,
    (n >>> 14) & 0x7f,
    (n >>> 7) & 0x7f,
    n & 0x7f,
  ]);
}

/** Frame header: 4-char ID, 4-byte big-endian size (plain uint32 in v2.3), 2 flag bytes. */
function frame(id: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(10);
  header.write(id, 0, "latin1");
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

/** Text frame encoded as UTF-16 with BOM (encoding byte 0x01). */
function textFrame(id: string, value: string): Buffer {
  const bom = Buffer.from([0xff, 0xfe]);
  const text = Buffer.from(value, "utf16le");
  return frame(id, Buffer.concat([Buffer.from([0x01]), bom, text]));
}

/** APIC frame: front-cover picture (type 0x03) with an empty description. */
function apicFrame(mime: string, data: Buffer): Buffer {
  const mimeBytes = Buffer.from(mime, "latin1");
  return frame(
    "APIC",
    Buffer.concat([
      Buffer.from([0x00]), // encoding: ISO-8859-1 (for the description)
      mimeBytes,
      Buffer.from([0x00]), // mime terminator
      Buffer.from([0x03]), // picture type: front cover
      Buffer.from([0x00]), // empty description terminator
      data,
    ]),
  );
}

/** Skip an existing ID3v2 tag (and footer, if flagged) at the start of the buffer. */
function stripId3(buf: Buffer): Buffer {
  if (buf.length < 10 || buf.toString("latin1", 0, 3) !== "ID3") return buf;
  const flags = buf[5];
  const size =
    ((buf[6] & 0x7f) << 21) |
    ((buf[7] & 0x7f) << 14) |
    ((buf[8] & 0x7f) << 7) |
    (buf[9] & 0x7f);
  const total = 10 + size + (flags & 0x10 ? 10 : 0);
  return total < buf.length ? buf.subarray(total) : buf;
}

/** Prepend an ID3v2.3 tag with the given metadata, replacing any existing tag. */
export function embedId3(mp3: Buffer, meta: Id3Meta): Buffer {
  const frames: Buffer[] = [];
  if (meta.title) frames.push(textFrame("TIT2", meta.title));
  if (meta.artist) frames.push(textFrame("TPE1", meta.artist));
  if (meta.album) frames.push(textFrame("TALB", meta.album));
  if (meta.trackNumber) frames.push(textFrame("TRCK", String(meta.trackNumber)));
  if (meta.image) frames.push(apicFrame(meta.image.mime, meta.image.data));
  if (frames.length === 0) return mp3;

  const body = Buffer.concat(frames);
  const header = Buffer.concat([
    Buffer.from("ID3", "latin1"),
    Buffer.from([0x03, 0x00, 0x00]), // v2.3.0, no flags
    synchsafe(body.length),
  ]);
  return Buffer.concat([header, body, stripId3(mp3)]);
}

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png"]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // keep embedded art reasonable

/**
 * Fetch cover art as JPEG for APIC embedding. Accepts anything
 * getAlbumCover does (Cloudinary URL, bare publicId, local /assets path).
 * Returns null on any failure — cover art is best-effort.
 */
export async function fetchCoverArt(
  coverImage: string | null | undefined,
): Promise<{ mime: string; data: Buffer } | null> {
  if (!coverImage) return null;
  try {
    // f_jpg instead of f_auto: APIC needs a universally supported format,
    // and a server-side fetch would otherwise negotiate webp/avif.
    let url = getAlbumCover(coverImage, 1000).replace("f_auto", "f_jpg");
    if (!url) return null;
    if (url.startsWith("/")) {
      const site = process.env.NEXT_PUBLIC_SITE_URL;
      if (!site) return null;
      url = new URL(url, site).toString();
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED_IMAGE_MIMES.has(mime)) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length === 0 || data.length > MAX_IMAGE_BYTES) return null;
    return { mime, data };
  } catch (err) {
    logError(err, { caller: "id3.fetchCoverArt" });
    return null;
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "").trim();
  return cleaned || "track";
}

/**
 * Fetch the signed Cloudinary MP3, embed cover art + metadata, and return a
 * ready-to-send download Response. Returns null on any failure so callers
 * can fall back to the plain redirect and never break a paid download.
 */
export async function buildTaggedMp3Response(options: {
  audioUrl: string;
  meta: Id3Meta;
  coverImage?: string | null;
}): Promise<Response | null> {
  try {
    const [audioRes, image] = await Promise.all([
      fetch(options.audioUrl),
      fetchCoverArt(options.coverImage),
    ]);
    if (!audioRes.ok) return null;
    const mp3 = Buffer.from(await audioRes.arrayBuffer());
    if (mp3.length === 0) return null;

    const tagged = embedId3(mp3, { ...options.meta, image: image ?? undefined });
    const filename = `${sanitizeFilename(options.meta.title ?? "track")}.mp3`;
    return new Response(new Uint8Array(tagged), {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "content-length": String(tagged.length),
        "content-disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "no-store",
        pragma: "no-cache",
      },
    });
  } catch (err) {
    logError(err, { caller: "id3.buildTaggedMp3Response" });
    return null;
  }
}
