import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("hero_media")
    .select("id, url, public_id, media_type, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    logError(error, { caller: "admin/hero GET" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers)))
    return Response.json({ error: "csrf_invalid" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const url = typeof b.url === "string" ? b.url.trim() : "";
  const publicId = typeof b.public_id === "string" ? b.public_id.trim() : "";
  const mediaType = b.media_type === "video" ? "video" : "image";

  if (!url || !publicId)
    return Response.json({ error: "url and public_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("hero_media")
    .insert({ url, public_id: publicId, media_type: mediaType, is_active: false })
    .select("id")
    .single();

  if (error) {
    logError(error, { caller: "admin/hero POST insert" });
    return Response.json({ error: "operation_failed" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "hero_media_upload",
    entityType: "hero_media",
    entityId: data.id,
    performedBy: "admin",
    metadata: { media_type: mediaType },
  });
  revalidateTag("hero-media", { expire: 0 });
  return Response.json({ ok: true, id: data.id }, { status: 201 });
}
