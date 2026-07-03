import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT =
  "id, portrait_url, portrait_public_id, landscape_url, landscape_public_id, album_id, replay_mode, is_active, created_at";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("intro_videos")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    logError(error, { caller: "admin/intro GET" });
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
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const portraitUrl = str(b.portrait_url);
  const portraitPublicId = str(b.portrait_public_id);
  const landscapeUrl = str(b.landscape_url);
  const landscapePublicId = str(b.landscape_public_id);
  const albumId = str(b.album_id);
  const replayMode = b.replay_mode === "always" ? "always" : "session";

  // At least one video source is required for a usable pop-up.
  if (!portraitUrl && !landscapeUrl)
    return Response.json(
      { error: "A portrait (9:16) or landscape (16:9) video is required" },
      { status: 400 },
    );

  const { data, error } = await supabaseAdmin
    .from("intro_videos")
    .insert({
      portrait_url: portraitUrl,
      portrait_public_id: portraitPublicId,
      landscape_url: landscapeUrl,
      landscape_public_id: landscapePublicId,
      album_id: albumId,
      replay_mode: replayMode,
      is_active: false,
    })
    .select("id")
    .single();

  if (error) {
    logError(error, { caller: "admin/intro POST insert" });
    return Response.json({ error: "operation_failed" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "intro_video_created",
    entityType: "intro_video",
    entityId: data.id,
    performedBy: "admin",
    metadata: { replay_mode: replayMode, has_landscape: Boolean(landscapeUrl) },
  });
  revalidateTag("intro-video", { expire: 0 });
  return Response.json({ ok: true, id: data.id }, { status: 201 });
}
