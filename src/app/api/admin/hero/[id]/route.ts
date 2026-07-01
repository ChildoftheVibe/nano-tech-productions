import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ACTIVE = 10;

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

  if (isActive) {
    // Count how many are already active (excluding this one in case it's a re-activate).
    const { count, error: countErr } = await supabaseAdmin
      .from("hero_media")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .neq("id", id);

    if (countErr) {
      logError(countErr, { caller: "admin/hero PATCH count" });
      return Response.json({ error: "operation_failed" }, { status: 500 });
    }
    if ((count ?? 0) >= MAX_ACTIVE)
      return Response.json(
        { error: `Carousel is full — max ${MAX_ACTIVE} active items` },
        { status: 400 },
      );

    // Assign the next available carousel position.
    const { data: maxRow } = await supabaseAdmin
      .from("hero_media")
      .select("position")
      .eq("is_active", true)
      .order("position", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const nextPos = ((maxRow?.position as number | null | undefined) ?? 0) + 1;

    const { error } = await supabaseAdmin
      .from("hero_media")
      .update({ is_active: true, position: nextPos })
      .eq("id", id);

    if (error) {
      logError(error, { caller: "admin/hero PATCH activate" });
      return Response.json({ error: "operation_failed" }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin
      .from("hero_media")
      .update({ is_active: false, position: null })
      .eq("id", id);

    if (error) {
      logError(error, { caller: "admin/hero PATCH deactivate" });
      return Response.json({ error: "operation_failed" }, { status: 500 });
    }
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
