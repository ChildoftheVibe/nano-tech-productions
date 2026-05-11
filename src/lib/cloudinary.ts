import "server-only";

import { v2 as cloudinary } from "cloudinary";

export const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

if (cloudName) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

const PUBLIC_FOLDER = "ntp/audio/public";
const VAULT_FOLDER = "ntp/audio/vault";

export function cloudinaryUrl(publicId: string, transform = "f_auto,q_auto") {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

/**
 * Public-facing streaming URL. Cloudinary transcodes the source to MP3 320kbps
 * on first request and caches the result on the CDN. Safe to embed in HTML.
 */
export function getPublicStreamingUrl(publicId: string): string {
  if (!publicId) return "";
  if (/^https?:\/\//.test(publicId)) return publicId;
  const url = `https://res.cloudinary.com/${cloudName}/video/upload/f_mp3,br_320k/${PUBLIC_FOLDER}/${publicId}`;
  console.log("[cloudinary.getPublicStreamingUrl]", publicId, "→", url);
  return url;
}

/**
 * Signed download URL given to a verified purchaser. 2-hour expiry; format is
 * MP3 320 with `fl_attachment` so browsers prompt a download. Server-only.
 */
export function getPurchaseDownloadUrl(publicId: string, orderId: string): string {
  if (!publicId || !cloudName || !apiSecret) return "";
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 2;
  return cloudinary.url(`${PUBLIC_FOLDER}/${publicId}`, {
    resource_type: "video",
    type: "upload",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
    transformation: [{ flags: "attachment", fetch_format: "mp3", bit_rate: "320k" }],
    context: { order: orderId },
  });
}

/**
 * Admin streaming URL for the WAV master in the private vault. 30-min expiry.
 * Authenticated delivery type — Cloudinary refuses unsigned access. Server-only.
 */
export function getAdminWavUrl(publicId: string): string {
  if (!publicId || !cloudName || !apiSecret) return "";
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 30;
  return cloudinary.url(`${VAULT_FOLDER}/${publicId}`, {
    resource_type: "video",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
    format: "wav",
  });
}

/**
 * Admin one-shot WAV download URL. 15-min expiry, attachment flag forces save.
 * The single-use semantics are enforced upstream by token bookkeeping.
 */
export function getAdminWavDownloadUrl(publicId: string): string {
  if (!publicId || !cloudName || !apiSecret) return "";
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 15;
  return cloudinary.url(`${VAULT_FOLDER}/${publicId}`, {
    resource_type: "video",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
    transformation: [{ flags: "attachment" }],
    format: "wav",
  });
}

/**
 * Legacy alias kept for callers that haven't migrated. Now routes through the
 * public streaming pipeline.
 */
export function getStreamingUrl(publicId: string): string {
  return getPublicStreamingUrl(publicId);
}

// ─────────────────────────────────────────────────────────────────────
// Phase 9 spec helpers. Thin wrappers over the existing API so callers can
// use the simpler names while we keep backwards compatibility.
// ─────────────────────────────────────────────────────────────────────

// Album cover URL builder lives in a client-safe module so AlbumCard (a
// "use client" component) can import it without dragging in the
// server-only Cloudinary SDK config above.
export { getAlbumCover, ALBUM_COVER_BLUR_DATA_URL } from "./albumCover";
export type { AlbumCoverSize } from "./albumCover";

/**
 * Public streaming audio URL. Alias for getPublicStreamingUrl with a name that
 * matches the phase 9 spec.
 */
export function getAudioUrl(publicId: string): string {
  return getPublicStreamingUrl(publicId);
}

/**
 * Server-side upload helper for the admin. Use this from API routes — it
 * relies on the configured api_secret. The Cloudinary SDK accepts either a
 * remote URL string, a local file path, or a base64 data URI.
 *
 * For browser-driven uploads keep using the signed-upload flow in
 * /api/admin/cloudinary-sign + components/admin/CloudinaryUploader.
 */
export async function uploadToCloudinary(
  source: string,
  folder: "ntp/images/covers" | "ntp/audio/public" | "ntp/audio/vault",
  options: {
    resourceType?: "image" | "video" | "raw";
    type?: "upload" | "authenticated";
  } = {},
): Promise<{ publicId: string; url: string; bytes: number; format?: string }> {
  if (!cloudName || !apiSecret) {
    throw new Error("cloudinary_not_configured");
  }
  const result = await cloudinary.uploader.upload(source, {
    folder,
    resource_type: options.resourceType ?? "auto",
    type: options.type ?? "upload",
  });
  return {
    publicId: result.public_id,
    url: result.secure_url,
    bytes: result.bytes,
    format: result.format,
  };
}
