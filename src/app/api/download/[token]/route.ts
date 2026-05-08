import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPurchaseDownloadUrl } from "@/lib/cloudinary";
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
      eventType: "download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "rate_limited" },
    });
    return reject();
  }

  if (!token || token.length < 32) {
    await logAuditEvent({
      eventType: "download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "missing_token" },
    });
    return reject();
  }

  const { data: dlToken, error: tokenErr } = await supabaseAdmin
    .from("download_tokens")
    .select("id, order_id, track_id, format, expires_at, used_at, is_used")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr || !dlToken) {
    await logAuditEvent({
      eventType: "download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "unknown_token" },
    });
    return reject();
  }

  if (dlToken.is_used) {
    await logAuditEvent({
      eventType: "download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "track",
      entityId: dlToken.track_id ?? undefined,
      metadata: { reason: "token_used" },
    });
    return reject();
  }

  if (new Date(dlToken.expires_at).getTime() <= Date.now()) {
    await logAuditEvent({
      eventType: "download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "track",
      entityId: dlToken.track_id ?? undefined,
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
      eventType: "download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "track",
      entityId: dlToken.track_id ?? undefined,
      metadata: { reason: "order_not_completed" },
    });
    return reject();
  }

  const { data: track } = await supabaseAdmin
    .from("tracks")
    .select("id, public_audio_id")
    .eq("id", dlToken.track_id)
    .maybeSingle();

  if (!track || !track.public_audio_id) {
    await logAuditEvent({
      eventType: "download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "track",
      entityId: dlToken.track_id ?? undefined,
      metadata: { reason: "track_unavailable" },
    });
    return reject();
  }

  const signedUrl = getPurchaseDownloadUrl(track.public_audio_id, order.id);
  if (!signedUrl) {
    await logAuditEvent({
      eventType: "download_rejected",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      entityType: "track",
      entityId: track.id,
      metadata: { reason: "cloudinary_unconfigured" },
    });
    return reject();
  }

  await supabaseAdmin
    .from("download_tokens")
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      ip_address: ip,
    })
    .eq("id", dlToken.id);

  // download_count is denormalized; the audit_log is the source of truth.
  // Increment best-effort, ignore failures.
  void supabaseAdmin
    .rpc("increment_download_count", { track_id: track.id })
    .then(() => {});

  await logAuditEvent({
    eventType: "download_served",
    performedBy: ip,
    ipAddress: ip,
    userAgent,
    entityType: "track",
    entityId: track.id,
    metadata: { order_id: order.id, format: dlToken.format },
  });

  return NextResponse.redirect(signedUrl, { status: 302, headers: noStore() });
}
