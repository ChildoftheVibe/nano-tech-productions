import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { getInstrumentalDownloadUrl } from "@/lib/cloudinary";
import { buildTaggedMp3Response } from "@/lib/id3";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";
import { checkRateLimitStrict } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

const noStore = () => ({
  "cache-control": "no-store",
  pragma: "no-cache",
});

const reject = () =>
  NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore() });

/**
 * Single-use download endpoint for purchased instrumentals. Mirrors
 * /api/download/[token] for music tracks but reads from the
 * instrumental_download_tokens table and dispenses a Cloudinary signed
 * MP3 320 kbps URL with fl_attachment.
 */
export async function GET(req: Request, { params }: { params: Params }) {
  const { token } = await params;
  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "download",
    maxAttempts: 5,
    windowMinutes: 1,
  });
  if (!allowed) {
    await logAuditEvent({
      eventType: "instrumental_download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "rate_limited" },
    });
    return reject();
  }

  if (!token || token.length < 32) {
    await logAuditEvent({
      eventType: "instrumental_download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "missing_token" },
    });
    return reject();
  }

  const { data: dlToken, error: tokenErr } = await supabaseAdmin
    .from("instrumental_download_tokens")
    .select("id, order_id, instrumental_id, format, expires_at, used_at, is_used")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr || !dlToken) {
    await logAuditEvent({
      eventType: "instrumental_download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "unknown_token" },
    });
    return reject();
  }

  if (dlToken.is_used) {
    await logAuditEvent({
      eventType: "instrumental_download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "instrumental",
      entityId: dlToken.instrumental_id ?? undefined,
      metadata: { reason: "token_used" },
    });
    return reject();
  }

  if (new Date(dlToken.expires_at).getTime() <= Date.now()) {
    await logAuditEvent({
      eventType: "instrumental_download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "instrumental",
      entityId: dlToken.instrumental_id ?? undefined,
      metadata: { reason: "expired" },
    });
    return reject();
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("id", dlToken.order_id)
    .maybeSingle();

  if (orderErr || !order || order.status !== "completed") {
    await logAuditEvent({
      eventType: "instrumental_download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "instrumental",
      entityId: dlToken.instrumental_id ?? undefined,
      metadata: { reason: "order_not_completed" },
    });
    return reject();
  }

  const { data: instrumental } = await supabaseAdmin
    .from("instrumentals")
    .select("id, public_audio_id, title, cover_image")
    .eq("id", dlToken.instrumental_id)
    .maybeSingle();

  if (!instrumental || !instrumental.public_audio_id) {
    await logAuditEvent({
      eventType: "instrumental_download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "instrumental",
      entityId: dlToken.instrumental_id ?? undefined,
      metadata: { reason: "instrumental_unavailable" },
    });
    return reject();
  }

  const signedUrl = getInstrumentalDownloadUrl(
    instrumental.public_audio_id,
    order.id,
  );
  if (!signedUrl) {
    await logAuditEvent({
      eventType: "instrumental_download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "instrumental",
      entityId: instrumental.id,
      metadata: { reason: "cloudinary_unconfigured" },
    });
    return reject();
  }

  await supabaseAdmin
    .from("instrumental_download_tokens")
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      ip_address: ip,
    })
    .eq("id", dlToken.id);

  // download_count is denormalized; audit_log is the source of truth.
  // Skip the counter increment for now — the admin manager can compute
  // it from instrumental_download_served events if needed.

  await logAuditEvent({
    eventType: "instrumental_download_served",
    performedBy: ip,
    ipAddress: ip,
    userAgent,
    entityType: "instrumental",
    entityId: instrumental.id,
    metadata: {
      order_id: order.id,
      format: dlToken.format,
      title: instrumental.title,
    },
  });

  // Proxy the MP3 with the cover + title embedded as ID3 tags; the Cloudinary
  // transcode carries none. Falls back to the plain redirect on any failure —
  // a paid download must never 500.
  const tagged = await buildTaggedMp3Response({
    audioUrl: signedUrl,
    coverImage: instrumental.cover_image,
    meta: { title: instrumental.title ?? undefined },
  });
  if (tagged) return tagged;

  return NextResponse.redirect(signedUrl, { status: 302, headers: noStore() });
}
