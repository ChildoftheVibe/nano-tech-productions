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
  const isActive = Boolean(b.is_active);

  // When activating, deactivate all other entries first.
  if (isActive) {
    const { error: deactivateError } = await supabaseAdmin
      .from("hero_media")
      .update({ is_active: false })
      .neq("id", id);
    if (deactivateError) {
      logError(deactivateError, { caller: "admin/hero PATCH deactivate others" });
      return Response.json({ error: "operation_failed" }, { status: 500 });
    }
  }

  const { error } = await supabaseAdmin
    .from("hero_media")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    logError(error, { caller: "admin/hero PATCH" });
    return Response.json({ error: "operation_failed" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: isActive ? "hero_media_activated" : "hero_media_deactivated",
    entityType: "hero_media",
    entityId: id,
    performedBy: "admin",
  });
  revalidateTag("hero-media", { expire: 0 });
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
    .from("hero_media")
    .delete()
    .eq("id", id);

  if (error) {
    logError(error, { caller: "admin/hero DELETE" });
    return Response.json({ error: "operation_failed" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "hero_media_deleted",
    entityType: "hero_media",
    entityId: id,
    performedBy: "admin",
  });
  revalidateTag("hero-media", { expire: 0 });
  return Response.json({ ok: true });
}
