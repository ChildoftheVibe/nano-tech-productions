import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
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

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("instrumentals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    logError(error, { caller: "admin/instrumentals GET" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json({ instrumentals: data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const input = pickInstrumentalInput(body);
  if (!input.title || typeof input.title !== "string") {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (!input.slug || typeof input.slug !== "string") {
    return Response.json({ error: "slug is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("instrumentals")
    .insert(input)
    .select("*")
    .single();
  if (error) {
    logError(error, { caller: "admin/instrumentals POST" });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "instrumental_created",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    entityType: "instrumental",
    entityId: data.id,
    metadata: { title: data.title, slug: data.slug },
  });
  revalidate();
  return Response.json({ instrumental: data }, { status: 201 });
}
