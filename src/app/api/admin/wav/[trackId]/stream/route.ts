import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getAdminWavUrl } from "@/lib/cloudinary";
import { clientIpFromHeaders, logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ trackId: string }>;

/**
 * Audio-element-friendly proxy for the vault. Returns a 302 redirect to the
 * signed Cloudinary URL so callers can do:
 *
 *   audio.src = `/api/admin/wav/${trackId}/stream`;
 *   audio.play();   // both synchronous in the click handler
 *
 * That preserves the user-gesture token through autoplay-policy checks (the
 * JSON sibling endpoint can't, because the client has to await the fetch).
 *
 * Audit-logging is gated on requests without a Range header — those are the
 * initial GETs from the audio element. Range-based seeks come back through
 * this route too and would otherwise spam the log.
 */
export async function GET(
  req: Request,
  { params }: { params: Params },
) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const { trackId } = await params;

  const { data: track, error } = await supabaseAdmin
    .from("tracks")
    .select("id, vault_audio_id, title")
    .eq("id", trackId)
    .maybeSingle();

  if (error || !track) {
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

  const url = getAdminWavUrl(track.vault_audio_id);
  if (!url) {
    return NextResponse.json(
      { error: "cloudinary_unconfigured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  if (!req.headers.has("range")) {
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

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "cache-control": "no-store" },
  });
}
