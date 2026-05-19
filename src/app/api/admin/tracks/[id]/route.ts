import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logError, logInfo } from "@/lib/logger";
import type { TrackInput } from "@/lib/db-types";

function revalidateTrackTags() {
  revalidateTag("tracks", { expire: 0 });
  revalidateTag("albums", { expire: 0 });
  revalidateTag("playlist", { expire: 0 });
  revalidateTag("artists", { expire: 0 });
}

const TRACK_FIELDS = [
  "album_id",
  "title",
  "track_number",
  "duration",
  "price",
  "audio_url",
  "public_audio_id",
  "vault_audio_id",
  "wav_checksum",
  "wav_file_size_mb",
  "is_downloadable",
  "is_published",
  "features",
  "credits",
  "lyrics",
  "has_lyrics",
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

  if (
    "audio_url" in input ||
    "public_audio_id" in input ||
    "vault_audio_id" in input
  ) {
    logInfo("admin/tracks PATCH audio fields updated", {
      id,
      has_vault: !!input.vault_audio_id,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("tracks")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logError(error, { caller: "admin/tracks PATCH", id });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  revalidateTrackTags();
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
  if (error) {
    logError(error, { caller: "admin/tracks DELETE", id });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }
  revalidateTrackTags();
  return Response.json({ ok: true });
}
