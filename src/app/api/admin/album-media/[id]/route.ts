import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers)))
    return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;

  // Snapshot before deleting: if this media is an album's portal intro video,
  // the FK nulls portal_video_media_id but the denormalized url must be
  // cleared explicitly.
  const { data: media } = await supabaseAdmin
    .from("album_media")
    .select("album_id, url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("album_media")
    .delete()
    .eq("id", id);

  if (error) {
    logError(error, { caller: "admin/album-media DELETE" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }

  if (media?.album_id && media.url) {
    const { error: clearError } = await supabaseAdmin
      .from("albums")
      .update({ portal_video_url: null })
      .eq("id", media.album_id)
      .eq("portal_video_url", media.url);
    if (clearError) {
      logError(clearError, { caller: "admin/album-media DELETE clear portal video" });
    } else {
      revalidateTag("albums", { expire: 0 });
    }
  }

  await logAuditEvent({
    eventType: "album_media_deleted",
    entityType: "album_media",
    entityId: id,
    performedBy: "admin",
  });
  revalidateTag("album-media", { expire: 0 });
  return Response.json({ ok: true });
}
