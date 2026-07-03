import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { isAdmin, validateCsrf } from "@/lib/auth";
import { coverVideoTransform, coverVideoPosterTransform } from "@/lib/albumCover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

const SLUG_RE = /^[a-z0-9_-]+$/;

function isAllowedFolder(folder: string): boolean {
  // Legacy shared cover folder, kept so existing albums keep working.
  if (folder === "ntp/images/covers") return true;
  // Per-slug cover folder: ntp/<slug>/cover
  if (folder.startsWith("ntp/") && folder.endsWith("/cover")) {
    const slug = folder.slice("ntp/".length, -"/cover".length);
    return SLUG_RE.test(slug);
  }
  // Per-slug cover videos folder: ntp/<slug>/cover-videos
  if (folder.startsWith("ntp/") && folder.endsWith("/cover-videos")) {
    const slug = folder.slice("ntp/".length, -"/cover-videos".length);
    return SLUG_RE.test(slug);
  }
  // Artist images: ntp/artists/<slug>/{profile,banner}. Also allow the
  // _pending placeholder so the form can preview before a slug is finalized.
  if (folder.startsWith("ntp/artists/")) {
    const tail = folder.slice("ntp/artists/".length);
    const parts = tail.split("/");
    if (parts.length === 2 && (parts[1] === "profile" || parts[1] === "banner")) {
      return SLUG_RE.test(parts[0]) || parts[0] === "_pending";
    }
  }
  for (const base of [
    "ntp/audio/public/",
    "ntp/audio/vault/",
    "ntp/audio/instrumentals/public/",
    "ntp/audio/instrumentals/vault/",
  ] as const) {
    if (folder.startsWith(base)) {
      const slug = folder.slice(base.length);
      return SLUG_RE.test(slug);
    }
  }
  // Instrumental cover: ntp/instrumentals/<slug>/cover.
  if (folder.startsWith("ntp/instrumentals/") && folder.endsWith("/cover")) {
    const slug = folder.slice(
      "ntp/instrumentals/".length,
      -"/cover".length,
    );
    return SLUG_RE.test(slug);
  }
  // Hero media (images and videos for the home page hero section).
  if (folder === "ntp/hero") return true;
  // Intro / landing pop-up videos (portrait 9:16 + landscape 16:9).
  if (folder === "ntp/intro") return true;
  return false;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  if (!(await validateCsrf(req.headers))) {
    return NextResponse.json({ error: "csrf_invalid" }, { status: 403, headers: noStore });
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "cloudinary_unconfigured" },
      { status: 503, headers: noStore },
    );
  }

  let body: { folder?: string; resourceType?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }

  const folder = body.folder ?? "";
  if (!isAllowedFolder(folder)) {
    return NextResponse.json(
      { error: "folder_not_allowed" },
      { status: 400, headers: noStore },
    );
  }

  const resourceType =
    body.resourceType === "video" || body.resourceType === "raw"
      ? body.resourceType
      : "image";

  const timestamp = Math.floor(Date.now() / 1000);

  const isVault = folder.startsWith("ntp/audio/vault");
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };
  if (isVault) paramsToSign.type = "authenticated";

  // Pre-generate the exact derivations the public site requests (cover-video
  // MP4s + posters, streaming MP3s) so the first visitor never triggers an
  // on-demand transcode, which can take 10–30s. eager_async keeps the upload
  // response fast; Cloudinary derives in the background. The strings must
  // match the delivery transforms byte-for-byte or the cache is missed.
  let eager: string | undefined;
  if (resourceType === "video" && folder.endsWith("/cover-videos")) {
    eager = [
      coverVideoTransform(400), // "lg" — AlbumCoverCarousel default
      coverVideoTransform(300), // "md"
      coverVideoPosterTransform(400),
      coverVideoPosterTransform(300),
    ].join("|");
  } else if (
    resourceType === "video" &&
    folder.startsWith("ntp/audio/instrumentals/public/")
  ) {
    // Full stream (getInstrumentalStreamUrl) + 30s preview
    // (getInstrumentalPreviewUrl — chained transform, hence the "/").
    eager = "f_mp3,br_320k|fl_splice,du_30/f_mp3,br_128k";
  } else if (resourceType === "video" && folder.startsWith("ntp/audio/public/")) {
    // Streaming MP3 (getPublicStreamingUrl). Without this the first listener
    // of every track waits on a cold full-length transcode.
    eager = "f_mp3,br_320k";
  }
  if (eager) {
    paramsToSign.eager = eager;
    paramsToSign.eager_async = "true";
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json(
    {
      cloudName,
      apiKey,
      timestamp,
      folder,
      resourceType,
      signature,
      type: isVault ? "authenticated" : "upload",
      ...(eager ? { eager, eagerAsync: true } : {}),
    },
    { headers: noStore },
  );
}
