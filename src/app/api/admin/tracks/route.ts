import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
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

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ tracks: data });
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

  const input = pickTrackInput(body);
  if (!input.title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  console.log("[admin/tracks POST] input audio fields:", {
    audio_url: input.audio_url,
    public_audio_id: input.public_audio_id,
    vault_audio_id: input.vault_audio_id,
  });

  const { data, error } = await supabaseAdmin
    .from("tracks")
    .insert(input)
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });

  console.log("[admin/tracks POST] saved audio fields:", {
    id: data.id,
    audio_url: data.audio_url,
    public_audio_id: data.public_audio_id,
    vault_audio_id: data.vault_audio_id,
  });

  revalidateTrackTags();
  return Response.json({ track: data }, { status: 201 });
}
