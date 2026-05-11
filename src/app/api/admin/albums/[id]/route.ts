import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { AlbumInput } from "@/lib/db-types";

const ALBUM_FIELDS = [
  "slug",
  "title",
  "description",
  "release_date",
  "cover_image",
  "background_color",
  "accent_color",
  "spotify_url",
  "apple_music_url",
  "youtube_url",
  "amazon_url",
  "copyright",
  "is_published",
] as const;

function pickAlbumInput(body: unknown): AlbumInput {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: AlbumInput = {};
  for (const key of ALBUM_FIELDS) {
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

  const input = { ...pickAlbumInput(body), updated_at: new Date().toISOString() };

  const { data, error } = await supabaseAdmin
    .from("albums")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  revalidateTag("albums", { expire: 0 });
  return Response.json({ album: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { error } = await supabaseAdmin.from("albums").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  revalidateTag("albums", { expire: 0 });
  return Response.json({ ok: true });
}
