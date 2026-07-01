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

  const { error } = await supabaseAdmin
    .from("album_media")
    .delete()
    .eq("id", id);

  if (error) {
    logError(error, { caller: "admin/album-media DELETE" });
    return Response.json({ error: "internal_error" }, { status: 500 });
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
