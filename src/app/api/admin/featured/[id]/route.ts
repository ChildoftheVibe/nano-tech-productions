import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";

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

  const update: { is_active?: boolean; position?: number } = {};
  if (body && typeof body === "object") {
    const src = body as Record<string, unknown>;
    if (typeof src.is_active === "boolean") update.is_active = src.is_active;
    if (typeof src.position === "number") update.position = src.position;
  }

  if (Object.keys(update).length === 0)
    return Response.json({ error: "no_fields" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("featured_albums")
    .update(update)
    .eq("id", id)
    .select("id, album_id, position, is_active")
    .single();

  if (error) {
    logError(error, { caller: "admin/featured PATCH", id });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }
  revalidateTag("featured", { expire: 0 });
  revalidateTag("albums", { expire: 0 });
  return Response.json({ entry: data });
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
    .from("featured_albums")
    .delete()
    .eq("id", id);

  if (error) {
    logError(error, { caller: "admin/featured DELETE", id });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }
  revalidateTag("featured", { expire: 0 });
  revalidateTag("albums", { expire: 0 });
  return Response.json({ ok: true });
}
