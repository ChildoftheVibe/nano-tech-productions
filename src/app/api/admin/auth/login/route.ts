import { NextResponse } from "next/server";
import {
  createSession,
  setAdminCookie,
  verifyPassword,
} from "@/lib/auth";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "admin_login",
    maxAttempts: 5,
    windowMinutes: 15,
  });

  if (!allowed) {
    await logAuditEvent({
      eventType: "admin_login_blocked",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
      metadata: { reason: "rate_limited" },
    });
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!password || !(await verifyPassword(password))) {
    await logAuditEvent({
      eventType: "admin_login_failed",
      performedBy: ip,
      ipAddress: ip,
      userAgent,
    });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  let token: string;
  try {
    token = await createSession(ip);
  } catch (err) {
    logError(err, { caller: "admin/auth/login" });
    return NextResponse.json({ error: "session_failed" }, { status: 500 });
  }

  await setAdminCookie(token);
  await logAuditEvent({
    eventType: "admin_login_success",
    performedBy: ip,
    ipAddress: ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
