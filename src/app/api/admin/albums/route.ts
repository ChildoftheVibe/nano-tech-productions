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

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ albums: data });
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

  const input = pickAlbumInput(body);
  if (!input.slug || !input.title) {
    return Response.json(
      { error: "slug and title are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("albums")
    .insert(input)
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ album: data }, { status: 201 });
}
