import { revalidateTag } from "next/cache";
import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INSTRUMENTAL_FIELDS = [
  "album_id",
  "title",
  "slug",
  "description",
  "type",
  "price",
  "cover_image",
  "public_audio_id",
  "vault_audio_id",
  "preview_audio_id",
  "audio_url",
  "preview_url",
  "duration",
  "is_published",
  "is_downloadable",
] as const;

type InstrumentalInput = Partial<
  Record<(typeof INSTRUMENTAL_FIELDS)[number], unknown>
>;

function pickInstrumentalInput(body: unknown): InstrumentalInput {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: InstrumentalInput = {};
  for (const key of INSTRUMENTAL_FIELDS) {
    if (key in src) {
      const val = src[key];
      out[key] = val === "" ? null : val;
    }
  }
  return out;
}

function revalidate() {
  revalidateTag("instrumentals", { expire: 0 });
}

type Params = Promise<{ id: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("instrumentals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logError(error, { caller: "admin/instrumentals GET", id });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ instrumental: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Params },
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

  const input = pickInstrumentalInput(body);
  if (Object.keys(input).length === 0) {
    return Response.json({ error: "no_fields" }, { status: 400 });
  }
  // Always bump updated_at since the row's trigger isn't guaranteed in this
  // codebase (the migration relies on default NOW() only at insert time).
  (input as Record<string, unknown>).updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("instrumentals")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    logError(error, { caller: "admin/instrumentals PATCH", id });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "instrumental_updated",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    entityType: "instrumental",
    entityId: data.id,
    metadata: { fields: Object.keys(input) },
  });
  revalidate();
  return Response.json({ instrumental: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Params },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers))) return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("instrumentals")
    .delete()
    .eq("id", id);
  if (error) {
    logError(error, { caller: "admin/instrumentals DELETE", id });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "instrumental_deleted",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    entityType: "instrumental",
    entityId: id,
  });
  revalidate();
  return Response.json({ ok: true });
}
