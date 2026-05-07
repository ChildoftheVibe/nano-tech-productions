import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { TrackInput } from "@/lib/db-types";

const TRACK_FIELDS = [
  "album_id",
  "title",
  "track_number",
  "duration",
  "price",
  "audio_url",
  "is_downloadable",
  "is_published",
  "features",
] as const;

function pickTrackInput(body: unknown): TrackInput {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: TrackInput = {};
  for (const key of TRACK_FIELDS) {
    if (key in src) {
      const val = src[key];
      (out as Record<string, unknown>)[key] = val === "" ? null : val;
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

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const input = pickTrackInput(body);

  const { data, error } = await supabaseAdmin
    .from("tracks")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ track: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { error } = await supabaseAdmin.from("tracks").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
