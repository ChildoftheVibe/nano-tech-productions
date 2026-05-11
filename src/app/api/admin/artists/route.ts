import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { clientIpFromHeaders, logAuditEvent } from "@/lib/audit";

const ARTIST_FIELDS = [
  "slug",
  "name",
  "bio",
  "role",
  "profile_image",
  "banner_image",
  "location",
  "is_featured",
  "is_published",
  "sort_order",
  "spotify_url",
  "apple_music_url",
  "youtube_url",
  "instagram_url",
  "twitter_url",
  "website_url",
] as const;

const VALID_ROLES = new Set([
  "primary",
  "featured",
  "producer",
  "songwriter",
  "engineer",
]);

function pickArtistInput(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ARTIST_FIELDS) {
    if (key in src) {
      const val = src[key];
      out[key] = val === "" ? null : val;
    }
  }
  if (typeof out.role === "string" && !VALID_ROLES.has(out.role as string)) {
    out.role = "featured";
  }
  return out;
}

type AssociationInput = { id: string; role?: string | null };

function pickAssociations(value: unknown): AssociationInput[] {
  if (!Array.isArray(value)) return [];
  const out: AssociationInput[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      out.push({ id: item, role: null });
    } else if (item && typeof item === "object" && "id" in item) {
      const id = (item as { id: unknown }).id;
      const role = (item as { role?: unknown }).role;
      if (typeof id === "string") {
        out.push({ id, role: typeof role === "string" ? role : null });
      }
    }
  }
  return out;
}

async function syncAssociations(
  artistId: string,
  tracks: AssociationInput[],
  albums: AssociationInput[],
): Promise<void> {
  // Replace-all semantics: delete existing rows, insert new ones. Cheap and
  // unambiguous given the expected size (a few dozen per artist at most).
  await Promise.all([
    supabaseAdmin.from("artist_tracks").delete().eq("artist_id", artistId),
    supabaseAdmin.from("artist_albums").delete().eq("artist_id", artistId),
  ]);
  if (tracks.length > 0) {
    const rows = tracks.map((t) => ({
      artist_id: artistId,
      track_id: t.id,
      role: t.role || "featured",
    }));
    const { error } = await supabaseAdmin.from("artist_tracks").insert(rows);
    if (error) console.error("[artists] insert artist_tracks", error.message);
  }
  if (albums.length > 0) {
    const rows = albums.map((a) => ({
      artist_id: artistId,
      album_id: a.id,
      role: a.role || "featured",
    }));
    const { error } = await supabaseAdmin.from("artist_albums").insert(rows);
    if (error) console.error("[artists] insert artist_albums", error.message);
  }
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("artists")
    .select(
      `id, slug, name, role, profile_image, location, is_featured, is_published, sort_order, created_at,
       artist_tracks(count),
       artist_albums(count)`,
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    slug: string;
    name: string;
    role: string | null;
    profile_image: string | null;
    location: string | null;
    is_featured: boolean | null;
    is_published: boolean | null;
    sort_order: number | null;
    created_at: string;
    artist_tracks: Array<{ count: number }> | null;
    artist_albums: Array<{ count: number }> | null;
  };

  const artists = ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role ?? "featured",
    profileImage: row.profile_image,
    location: row.location,
    isFeatured: !!row.is_featured,
    isPublished: !!row.is_published,
    sortOrder: row.sort_order ?? 0,
    trackCount: row.artist_tracks?.[0]?.count ?? 0,
    albumCount: row.artist_albums?.[0]?.count ?? 0,
    createdAt: row.created_at,
  }));

  return Response.json({ artists });
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

  const input = pickArtistInput(body);
  if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  if (!input.slug || typeof input.slug !== "string" || !input.slug.trim()) {
    return Response.json({ error: "slug is required" }, { status: 400 });
  }

  const trackAssoc = pickAssociations(
    (body as Record<string, unknown>).tracks,
  );
  const albumAssoc = pickAssociations(
    (body as Record<string, unknown>).albums,
  );

  const { data, error } = await supabaseAdmin
    .from("artists")
    .insert(input)
    .select("*")
    .single();

  if (error || !data)
    return Response.json(
      { error: error?.message ?? "insert_failed" },
      { status: 400 },
    );

  await syncAssociations(data.id, trackAssoc, albumAssoc);

  const h = await headers();
  await logAuditEvent({
    eventType: "artist.create",
    entityType: "artist",
    entityId: data.id,
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(h),
    metadata: { slug: data.slug, name: data.name },
  });

  revalidateTag("artists", { expire: 0 });
  return Response.json({ artist: data }, { status: 201 });
}
