import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";
import type { AlbumInput } from "@/lib/db-types";

const ALBUM_FIELDS = [
  "slug",
  "title",
  "description",
  "release_date",
  "cover_image",
  "cover_videos",
  "background_color",
  "accent_color",
  "spotify_url",
  "apple_music_url",
  "youtube_url",
  "amazon_url",
  "copyright",
  "nb_price",
  "light_mode",
  "is_published",
] as const;

function pickAlbumInput(body: unknown): AlbumInput {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: AlbumInput = {};
  for (const key of ALBUM_FIELDS) {
    if (key in src) {
      const val = src[key];
      if (key === "nb_price") {
        const n = Number(val);
        (out as Record<string, unknown>)[key] = isFinite(n) && n > 0 ? Math.round(n) : null;
      } else {
        (out as Record<string, unknown>)[key] = val === "" ? null : val;
      }
    }
  }
  return out;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers))) return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const input = { ...pickAlbumInput(body), updated_at: new Date().toISOString() };

  const { data, error } = await supabaseAdmin
    .from("albums")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logError(error, { caller: "admin/albums PATCH" });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "admin_album_updated",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    entityType: "album",
    entityId: id,
    metadata: { fields: Object.keys(input) },
  });

  revalidateTag("albums", { expire: 0 });
  return Response.json({ album: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers))) return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("albums")
    .select("slug, title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("albums").delete().eq("id", id);
  if (error) {
    logError(error, { caller: "admin/albums DELETE" });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "admin_album_deleted",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    entityType: "album",
    entityId: id,
    metadata: existing ?? undefined,
  });

  revalidateTag("albums", { expire: 0 });
  return Response.json({ ok: true });
}
