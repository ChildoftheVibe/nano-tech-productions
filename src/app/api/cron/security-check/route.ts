import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore },
    );
  }

  const ranAt = new Date().toISOString();
  const window24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const window1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [failedLogins, ipChanges, activeSessions, recentDownloads] = await Promise.all([
    // Failed admin login attempts in last 24h
    supabaseAdmin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "admin_login_failed")
      .gte("created_at", window24h),
    // IP-change invalidations in last 24h
    supabaseAdmin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "admin_session_ip_changed")
      .gte("created_at", window24h),
    // Currently active (non-expired, non-revoked) admin sessions
    supabaseAdmin
      .from("admin_sessions")
      .select("id", { count: "exact", head: true })
      .eq("is_revoked", false)
      .gt("expires_at", ranAt),
    // Download tokens minted in the last hour (spike detection)
    supabaseAdmin
      .from("download_tokens")
      .select("id", { count: "exact", head: true })
      .gte("created_at", window1h),
  ]);

  const checks = {
    failed_logins_24h: failedLogins.count ?? 0,
    ip_changes_24h: ipChanges.count ?? 0,
    active_sessions: activeSessions.count ?? 0,
    downloads_last_hour: recentDownloads.count ?? 0,
  };

  const alerts: string[] = [];
  if (checks.failed_logins_24h >= 10) alerts.push(`High failed logins: ${checks.failed_logins_24h}`);
  if (checks.ip_changes_24h > 0) alerts.push(`Session IP changes: ${checks.ip_changes_24h}`);
  if (checks.active_sessions > 3) alerts.push(`Unusual active sessions: ${checks.active_sessions}`);
  if (checks.downloads_last_hour > 50) alerts.push(`Download spike: ${checks.downloads_last_hour} in 1h`);

  try {
    await logAuditEvent({
      eventType: "cron_security_check",
      performedBy: "cron",
      metadata: { ranAt, checks, alerts },
    });
  } catch (err) {
    logError(err, { caller: "cron/security-check" });
  }

  return NextResponse.json(
    { ok: true, ranAt, checks, alerts },
    { headers: noStore },
  );
}
