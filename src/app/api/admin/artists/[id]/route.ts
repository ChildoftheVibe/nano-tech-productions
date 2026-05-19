import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { clientIpFromHeaders, logAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";

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
  tracks: AssociationInput[] | null,
  albums: AssociationInput[] | null,
): Promise<void> {
  if (tracks !== null) {
    await supabaseAdmin
      .from("artist_tracks")
      .delete()
      .eq("artist_id", artistId);
    if (tracks.length > 0) {
      const rows = tracks.map((t) => ({
        artist_id: artistId,
        track_id: t.id,
        role: t.role || "featured",
      }));
      const { error } = await supabaseAdmin
        .from("artist_tracks")
        .insert(rows);
      if (error) logError(error, { caller: "artists" });
    }
  }
  if (albums !== null) {
    await supabaseAdmin
      .from("artist_albums")
      .delete()
      .eq("artist_id", artistId);
    if (albums.length > 0) {
      const rows = albums.map((a) => ({
        artist_id: artistId,
        album_id: a.id,
        role: a.role || "featured",
      }));
      const { error } = await supabaseAdmin
        .from("artist_albums")
        .insert(rows);
      if (error) logError(error, { caller: "artists" });
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const [artistRes, tracksRes, albumsRes] = await Promise.all([
    supabaseAdmin.from("artists").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("artist_tracks")
      .select(
        "track_id, role, tracks(id, title, album_id, albums(title))",
      )
      .eq("artist_id", id),
    supabaseAdmin
      .from("artist_albums")
      .select("album_id, role, albums(id, title)")
      .eq("artist_id", id),
  ]);

  if (artistRes.error || !artistRes.data) {
    if (artistRes.error) logError(artistRes.error, { caller: "admin/artists GET", id });
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  type TrackJoin = {
    track_id: string;
    role: string | null;
    tracks: {
      id: string;
      title: string;
      album_id: string | null;
      albums: { title: string } | { title: string }[] | null;
    } | null;
  };
  type AlbumJoin = {
    album_id: string;
    role: string | null;
    albums: { id: string; title: string } | { id: string; title: string }[] | null;
  };

  const tracks = ((tracksRes.data ?? []) as unknown as TrackJoin[])
    .filter((r) => r.tracks)
    .map((r) => {
      const album = Array.isArray(r.tracks!.albums)
        ? r.tracks!.albums[0]
        : r.tracks!.albums;
      return {
        id: r.tracks!.id,
        title: r.tracks!.title,
        albumTitle: album?.title ?? null,
        role: r.role ?? "featured",
      };
    });

  const albums = ((albumsRes.data ?? []) as unknown as AlbumJoin[])
    .filter((r) => r.albums)
    .map((r) => {
      const album = Array.isArray(r.albums) ? r.albums[0] : r.albums;
      return {
        id: album!.id,
        title: album!.title,
        role: r.role ?? "featured",
      };
    });

  return Response.json({
    artist: artistRes.data,
    tracks,
    albums,
  });
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

  const input = pickArtistInput(body);
  if (Object.keys(input).length > 0) {
    (input as Record<string, unknown>).updated_at = new Date().toISOString();
  }
  const src = body as Record<string, unknown>;
  const tracks =
    "tracks" in src ? pickAssociations(src.tracks) : null;
  const albums =
    "albums" in src ? pickAssociations(src.albums) : null;

  const { data, error } = await supabaseAdmin
    .from("artists")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    logError(error ?? new Error("update_failed"), { caller: "admin/artists PATCH", id });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await syncAssociations(data.id, tracks, albums);

  const h = await headers();
  await logAuditEvent({
    eventType: "artist.update",
    entityType: "artist",
    entityId: data.id,
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(h),
    metadata: { slug: data.slug, name: data.name },
  });

  revalidateTag("artists", { expire: 0 });
  return Response.json({ artist: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  // Cascade deletes handle artist_tracks and artist_albums via FK.
  const { data: existing } = await supabaseAdmin
    .from("artists")
    .select("slug, name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("artists").delete().eq("id", id);
  if (error) {
    logError(error, { caller: "admin/artists DELETE", id });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  const h = await headers();
  await logAuditEvent({
    eventType: "artist.delete",
    entityType: "artist",
    entityId: id,
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(h),
    metadata: existing ?? undefined,
  });

  revalidateTag("artists", { expire: 0 });
  return Response.json({ ok: true });
}
