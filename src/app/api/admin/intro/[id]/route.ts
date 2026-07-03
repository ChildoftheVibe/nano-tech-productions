import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers)))
    return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("album_id" in b) {
    // Empty string / null clears the association.
    update.album_id =
      typeof b.album_id === "string" && b.album_id.trim() ? b.album_id.trim() : null;
  }
  if ("replay_mode" in b) {
    update.replay_mode = b.replay_mode === "always" ? "always" : "session";
  }

  const activating = "is_active" in b ? Boolean(b.is_active) : null;

  // Only one intro can be active at a time — deactivate the rest first.
  if (activating === true) {
    const { error: deactErr } = await supabaseAdmin
      .from("intro_videos")
      .update({ is_active: false })
      .neq("id", id);
    if (deactErr) {
      logError(deactErr, { caller: "admin/intro PATCH deactivate-others" });
      return Response.json({ error: "operation_failed" }, { status: 500 });
    }
    update.is_active = true;
  } else if (activating === false) {
    update.is_active = false;
  }

  if (Object.keys(update).length === 0)
    return Response.json({ error: "no_fields" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("intro_videos")
    .update(update)
    .eq("id", id);

  if (error) {
    logError(error, { caller: "admin/intro PATCH update" });
    return Response.json({ error: "operation_failed" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "intro_video_updated",
    entityType: "intro_video",
    entityId: id,
    performedBy: "admin",
    metadata: { fields: Object.keys(update) },
  });
  revalidateTag("intro-video", { expire: 0 });
  return Response.json({ ok: true });
}

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
    .from("intro_videos")
    .delete()
    .eq("id", id);

  if (error) {
    logError(error, { caller: "admin/intro DELETE" });
    return Response.json({ error: "operation_failed" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "intro_video_deleted",
    entityType: "intro_video",
    entityId: id,
    performedBy: "admin",
  });
  revalidateTag("intro-video", { expire: 0 });
  return Response.json({ ok: true });
}
