import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("featured_albums")
    .select("id, album_id, position, is_active, added_at")
    .order("position", { ascending: true, nullsFirst: false });

  if (error) {
    logError(error, { caller: "admin/featured GET" });
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

  const action =
    body && typeof body === "object" && "action" in body
      ? String((body as { action?: unknown }).action ?? "")
      : "";

  // ── add ──────────────────────────────────────────────────────────────────
  if (action === "add") {
    const albumId = String(
      (body as { album_id?: unknown }).album_id ?? "",
    );
    if (!albumId)
      return Response.json({ error: "album_id required" }, { status: 400 });

    // Reactivate if the row already exists (was previously removed softly).
    const { data: existing } = await supabaseAdmin
      .from("featured_albums")
      .select("id, is_active")
      .eq("album_id", albumId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("featured_albums")
        .update({ is_active: true })
        .eq("id", existing.id);
      if (error) {
        logError(error, { caller: "admin/featured add reactivate" });
        return Response.json({ error: "operation_failed" }, { status: 400 });
      }
      revalidateTag("featured", { expire: 0 });
      revalidateTag("albums", { expire: 0 });
      return Response.json({ ok: true, entryId: existing.id });
    }

    const { data: max } = await supabaseAdmin
      .from("featured_albums")
      .select("position")
      .order("position", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const nextPos =
      ((max?.position as number | null | undefined) ?? 0) + 1;

    const { data, error } = await supabaseAdmin
      .from("featured_albums")
      .insert({ album_id: albumId, position: nextPos, is_active: true })
      .select("id")
      .single();
    if (error) {
      logError(error, { caller: "admin/featured add insert" });
      return Response.json({ error: "operation_failed" }, { status: 400 });
    }
    revalidateTag("featured", { expire: 0 });
    revalidateTag("albums", { expire: 0 });
    return Response.json({ ok: true, entryId: data.id }, { status: 201 });
  }

  // ── reorder ───────────────────────────────────────────────────────────────
  if (action === "reorder") {
    const order = (body as { order?: unknown }).order;
    if (
      !Array.isArray(order) ||
      !order.every((v) => typeof v === "string")
    ) {
      return Response.json(
        { error: "order must be array of entry ids" },
        { status: 400 },
      );
    }
    for (let i = 0; i < order.length; i++) {
      const id = order[i] as string;
      const { error } = await supabaseAdmin
        .from("featured_albums")
        .update({ position: i + 1 })
        .eq("id", id);
      if (error) {
        logError(error, { caller: "admin/featured reorder", id });
        return Response.json({ error: "operation_failed" }, { status: 400 });
      }
    }
    revalidateTag("featured", { expire: 0 });
    revalidateTag("albums", { expire: 0 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unknown_action" }, { status: 400 });
}
