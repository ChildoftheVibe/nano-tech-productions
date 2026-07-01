import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get("album_id");
  if (!albumId) return Response.json({ error: "album_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("album_media")
    .select("id, url, public_id, media_type, position, caption, created_at")
    .eq("album_id", albumId)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    logError(error, { caller: "admin/album-media GET" });
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

  // ── reorder ──────────────────────────────────────────────────────────────
  if (b.action === "reorder") {
    const albumId = typeof b.album_id === "string" ? b.album_id : null;
    const order = b.order;
    if (!albumId || !Array.isArray(order) || !order.every((v) => typeof v === "string"))
      return Response.json({ error: "invalid reorder payload" }, { status: 400 });

    for (let i = 0; i < order.length; i++) {
      const { error } = await supabaseAdmin
        .from("album_media")
        .update({ position: i + 1 })
        .eq("id", order[i] as string)
        .eq("album_id", albumId);
      if (error) {
        logError(error, { caller: "admin/album-media reorder", id: order[i] });
        return Response.json({ error: "operation_failed" }, { status: 500 });
      }
    }
    revalidateTag("album-media", { expire: 0 });
    return Response.json({ ok: true });
  }

  // ── upload ────────────────────────────────────────────────────────────────
  const albumId = typeof b.album_id === "string" ? b.album_id : null;
  const url = typeof b.url === "string" ? b.url : null;
  const publicId = typeof b.public_id === "string" ? b.public_id : "";
  const mediaType = b.media_type === "image" || b.media_type === "video" ? b.media_type : null;
  const caption = typeof b.caption === "string" ? b.caption.slice(0, 200) : null;

  if (!albumId || !url || !mediaType)
    return Response.json({ error: "album_id, url, and media_type are required" }, { status: 400 });

  const { count: maxPos } = await supabaseAdmin
    .from("album_media")
    .select("id", { count: "exact", head: true })
    .eq("album_id", albumId);

  const { data, error } = await supabaseAdmin
    .from("album_media")
    .insert({ album_id: albumId, url, public_id: publicId, media_type: mediaType, position: (maxPos ?? 0) + 1, caption })
    .select("id")
    .single();

  if (error) {
    logError(error, { caller: "admin/album-media POST" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "album_media_uploaded",
    entityType: "album_media",
    entityId: data.id,
    performedBy: "admin",
    metadata: { album_id: albumId, media_type: mediaType },
  });
  revalidateTag("album-media", { expire: 0 });
  return Response.json({ id: data.id });
}
