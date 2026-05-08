import { NextResponse } from "next/server";
import {
  clearAdminCookie,
  readSessionCookie,
  revokeSession,
} from "@/lib/auth";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const token = await readSessionCookie();
  if (token) {
    try {
      await revokeSession(token);
    } catch (err) {
      console.error("[admin/auth/logout]", err);
    }
  }
  await clearAdminCookie();
  await logAuditEvent({
    eventType: "admin_logout",
    performedBy: ip,
    ipAddress: ip,
  });
  return NextResponse.redirect(new URL("/admin/login", req.url));
}
