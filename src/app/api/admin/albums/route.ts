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
  "price",
  "is_published",
] as const;

function pickAlbumInput(body: unknown): AlbumInput {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: AlbumInput = {};
  for (const key of ALBUM_FIELDS) {
    if (key in src) {
      const val = src[key];
      if (key === "price") {
        const n = Number(val);
        (out as Record<string, unknown>)[key] = isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
      } else {
        (out as Record<string, unknown>)[key] = val === "" ? null : val;
      }
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

  if (error) {
    logError(error, { caller: "admin/albums GET" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json({ albums: data });
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

  if (error) {
    logError(error, { caller: "admin/albums POST" });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "admin_album_created",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    entityType: "album",
    entityId: data.id,
    metadata: { slug: input.slug, title: input.title },
  });

  revalidateTag("albums", { expire: 0 });
  return Response.json({ album: data }, { status: 201 });
}
