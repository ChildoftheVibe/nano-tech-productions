import { supabaseAdmin } from "@/lib/supabase";
import { ArtistsManager, type AdminArtistRow } from "./ArtistsManager";
import type { AdminTrackOption, AdminAlbumOption } from "./ArtistForm";

export const dynamic = "force-dynamic";

export default async function AdminArtistsPage() {
  const [artistsRes, tracksRes, albumsRes] = await Promise.all([
    supabaseAdmin
      .from("artists")
      .select(
        `id, slug, name, role, profile_image, location, is_featured, is_published, sort_order,
         artist_tracks(count), artist_albums(count)`,
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("tracks")
      .select("id, title, album_id, albums(title)")
      .order("title", { ascending: true }),
    supabaseAdmin
      .from("albums")
      .select("id, title")
      .order("title", { ascending: true }),
  ]);

  const error = artistsRes.error ?? tracksRes.error ?? albumsRes.error;
  if (error) {
    return (
      <main className="p-8">
        <h1 className="mb-6 text-2xl font-semibold">Artists</h1>
        <p className="text-red-400">Failed to load: {error.message}</p>
      </main>
    );
  }

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
    artist_tracks: Array<{ count: number }> | null;
    artist_albums: Array<{ count: number }> | null;
  };

  const artists: AdminArtistRow[] = ((artistsRes.data ?? []) as Row[]).map(
    (row) => ({
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
    }),
  );

  type TrackRow = {
    id: string;
    title: string;
    album_id: string | null;
    albums: { title: string } | { title: string }[] | null;
  };
  const tracks: AdminTrackOption[] = (
    (tracksRes.data ?? []) as TrackRow[]
  ).map((t) => {
    const album = Array.isArray(t.albums) ? t.albums[0] : t.albums;
    return {
      id: t.id,
      title: t.title,
      albumTitle: album?.title ?? null,
    };
  });

  const albums: AdminAlbumOption[] = (
    (albumsRes.data ?? []) as Array<{ id: string; title: string }>
  ).map((a) => ({ id: a.id, title: a.title }));

  return (
    <main className="p-8">
      <ArtistsManager
        initialArtists={artists}
        allTracks={tracks}
        allAlbums={albums}
      />
    </main>
  );
}
