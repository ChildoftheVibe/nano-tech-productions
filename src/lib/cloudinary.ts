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
  return `https://res.cloudinary.com/${cloudName}/video/upload/f_mp3,br_320k/${PUBLIC_FOLDER}/${publicId}`;
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
  });
}

/**
 * Legacy alias kept for callers that haven't migrated. Now routes through the
 * public streaming pipeline.
 */
export function getStreamingUrl(publicId: string): string {
  return getPublicStreamingUrl(publicId);
}
