import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("playlist")
    .select("id, track_id, position, is_active, added_at")
    .order("position", { ascending: true, nullsFirst: false });

  if (error) {
    logError(error, { caller: "admin/playlist GET" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers))) return Response.json({ error: "csrf_invalid" }, { status: 403 });

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

  if (action === "add") {
    const trackId = String((body as { track_id?: unknown }).track_id ?? "");
    if (!trackId) {
      return Response.json({ error: "track_id required" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("playlist")
      .select("id, is_active")
      .eq("track_id", trackId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("playlist")
        .update({ is_active: true })
        .eq("id", existing.id);
      if (error) {
        logError(error, { caller: "admin/playlist add reactivate" });
        return Response.json({ error: "operation_failed" }, { status: 400 });
      }
      return Response.json({ ok: true, entryId: existing.id });
    }

    const { data: max } = await supabaseAdmin
      .from("playlist")
      .select("position")
      .order("position", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const nextPos = ((max?.position as number | null | undefined) ?? 0) + 1;

    const { data, error } = await supabaseAdmin
      .from("playlist")
      .insert({ track_id: trackId, position: nextPos, is_active: true })
      .select("id")
      .single();
    if (error) {
      logError(error, { caller: "admin/playlist add insert" });
      return Response.json({ error: "operation_failed" }, { status: 400 });
    }
    return Response.json({ ok: true, entryId: data.id }, { status: 201 });
  }

  if (action === "add_all_published") {
    const { data: tracks, error: tErr } = await supabaseAdmin
      .from("tracks")
      .select("id")
      .eq("is_published", true)
      .not("audio_url", "is", null);
    if (tErr) {
      logError(tErr, { caller: "admin/playlist add_all_published tracks" });
      return Response.json({ error: "internal_error" }, { status: 500 });
    }

    const { data: existing, error: pErr } = await supabaseAdmin
      .from("playlist")
      .select("id, track_id, position");
    if (pErr) {
      logError(pErr, { caller: "admin/playlist add_all_published existing" });
      return Response.json({ error: "internal_error" }, { status: 500 });
    }

    const existingByTrack = new Map<
      string,
      { id: string; position: number | null }
    >();
    let maxPos = 0;
    for (const row of (existing ?? []) as Array<{
      id: string;
      track_id: string;
      position: number | null;
    }>) {
      existingByTrack.set(row.track_id, { id: row.id, position: row.position });
      if (row.position && row.position > maxPos) maxPos = row.position;
    }

    const toReactivate: string[] = [];
    const toInsert: { track_id: string; position: number; is_active: true }[] = [];
    for (const t of (tracks ?? []) as Array<{ id: string }>) {
      const found = existingByTrack.get(t.id);
      if (found) {
        toReactivate.push(found.id);
      } else {
        maxPos += 1;
        toInsert.push({ track_id: t.id, position: maxPos, is_active: true });
      }
    }

    if (toReactivate.length > 0) {
      const { error } = await supabaseAdmin
        .from("playlist")
        .update({ is_active: true })
        .in("id", toReactivate);
      if (error) {
        logError(error, { caller: "admin/playlist reactivate" });
        return Response.json({ error: "operation_failed" }, { status: 400 });
      }
    }
    if (toInsert.length > 0) {
      const { error } = await supabaseAdmin.from("playlist").insert(toInsert);
      if (error) {
        logError(error, { caller: "admin/playlist bulk insert" });
        return Response.json({ error: "operation_failed" }, { status: 400 });
      }
    }

    return Response.json({
      ok: true,
      added: toInsert.length,
      reactivated: toReactivate.length,
    });
  }

  if (action === "reorder") {
    const order = (body as { order?: unknown }).order;
    if (!Array.isArray(order) || !order.every((v) => typeof v === "string")) {
      return Response.json(
        { error: "order must be array of entry ids" },
        { status: 400 },
      );
    }
    for (let i = 0; i < order.length; i++) {
      const id = order[i] as string;
      const { error } = await supabaseAdmin
        .from("playlist")
        .update({ position: i + 1 })
        .eq("id", id);
      if (error) {
        logError(error, { caller: "admin/playlist reorder", id });
        return Response.json({ error: "operation_failed" }, { status: 400 });
      }
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unknown_action" }, { status: 400 });
}
