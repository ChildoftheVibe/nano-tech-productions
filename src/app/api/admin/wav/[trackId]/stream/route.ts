import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { getAdminWavUrl } from "@/lib/cloudinary";
import { clientIpFromHeaders, logAuditEvent } from "@/lib/audit";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ trackId: string }>;

/**
 * Audio-element-friendly streaming proxy for the vault. Fetches the signed
 * Cloudinary WAV server-side and pipes the bytes back as a same-origin
 * audio/wav response so the caller can do:
 *
 *   audio.src = `/api/admin/wav/${trackId}/stream`;
 *   audio.play();   // both synchronous in the click handler
 *
 * Why proxy instead of 302? A cross-origin redirect returned through the
 * service worker yields an opaque Response, which media-destination
 * requests can't consume — audio playback fails silently. Streaming the
 * bytes through keeps the entire chain same-origin and lets the audio
 * element see Content-Type / Accept-Ranges / Content-Length normally.
 *
 * Range is forwarded so seeking works. Audit-logging is gated on requests
 * without a Range header — those are the initial GETs. Range-based seeks
 * come back through this route too and would otherwise spam the log.
 */
export async function GET(
  req: Request,
  { params }: { params: Params },
) {
  const { trackId } = await params;
  const hasRange = req.headers.has("range");

  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  logInfo("[wav/stream] GET", { trackId, range: hasRange });

  const { data: track, error } = await supabaseAdmin
    .from("tracks")
    .select("id, vault_audio_id, title")
    .eq("id", trackId)
    .maybeSingle();

  if (error || !track) {
    if (error) logError(error, { caller: "wav/stream GET", trackId });
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }
  if (!track.vault_audio_id) {
    return NextResponse.json(
      { error: "no_vault_file" },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  const signedUrl = getAdminWavUrl(track.vault_audio_id);
  if (!signedUrl) {
    logError(new Error("[wav/stream] 503 cloudinary not configured"), { trackId });
    return NextResponse.json(
      { error: "cloudinary_unconfigured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  logInfo("[wav/stream] proxying", { trackId, title: track.title });

  const upstreamHeaders: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) upstreamHeaders.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(signedUrl, { headers: upstreamHeaders });
  } catch (err) {
    logError(new Error("[wav/stream] upstream fetch threw"), {
      trackId,
      err: String(err),
    });
    return NextResponse.json(
      { error: "upstream_unreachable" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    logError(new Error("[wav/stream] upstream non-success"), {
      trackId,
      status: upstream.status,
      statusText: upstream.statusText,
    });
    return NextResponse.json(
      { error: "upstream_failed", status: upstream.status },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  if (!hasRange) {
    await logAuditEvent({
      eventType: "admin_wav_stream",
      performedBy: "admin",
      ipAddress: clientIpFromHeaders(req.headers),
      userAgent: req.headers.get("user-agent") ?? undefined,
      entityType: "track",
      entityId: track.id,
      metadata: { title: track.title },
    });
  }

  const headers = new Headers();
  headers.set(
    "content-type",
    upstream.headers.get("content-type") ?? "audio/wav",
  );
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);
  headers.set(
    "accept-ranges",
    upstream.headers.get("accept-ranges") ?? "bytes",
  );
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("content-range", contentRange);
  headers.set("cache-control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
