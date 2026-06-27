import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const url = new URL(req.url);
  const trackId = url.searchParams.get("trackId");
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? "50") || 50);

  let q = supabaseAdmin
    .from("audit_log")
    .select("id, event_type, performed_by, ip_address, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (trackId) q = q.eq("entity_id", trackId);

  const { data, error } = await q;
  if (error) {
    logError(error, { caller: "admin/audit GET" });
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ entries: data ?? [] }, { headers: noStore });
}
