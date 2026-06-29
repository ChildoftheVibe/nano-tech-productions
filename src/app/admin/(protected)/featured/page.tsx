import { supabaseAdmin } from "@/lib/db/admin";
import { getAlbumCover } from "@/lib/albumCover";
import {
  FeaturedManager,
  type FeaturedEntry,
  type AlbumOption,
} from "./FeaturedManager";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  const [featuredRes, albumsRes] = await Promise.all([
    supabaseAdmin
      .from("featured_albums")
      .select("id, album_id, position, is_active")
      .order("position", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("albums")
      .select("id, slug, title, release_date, cover_image, accent_color, is_published")
      .order("release_date", { ascending: false, nullsFirst: false }),
  ]);

  const error = featuredRes.error ?? albumsRes.error;

  type AlbumRow = {
    id: string;
    slug: string;
    title: string;
    release_date: string | null;
    cover_image: string | null;
    accent_color: string | null;
    is_published: boolean;
  };

  const albums: AlbumOption[] = ((albumsRes.data ?? []) as AlbumRow[]).map(
    (a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      releaseYear: a.release_date?.slice(0, 4) ?? null,
      coverImage: a.cover_image ? getAlbumCover(a.cover_image, "sm") : null,
      accentColor: a.accent_color ?? "#62f3e4",
      isPublished: a.is_published,
    }),
  );

  const entries: FeaturedEntry[] = (
    (featuredRes.data ?? []) as Array<{
      id: string;
      album_id: string;
      position: number | null;
      is_active: boolean;
    }>
  ).map((e) => ({
    id: e.id,
    albumId: e.album_id,
    position: e.position,
    isActive: e.is_active,
  }));

  return (
    <main className="p-8">
      <h1 className="mb-2 text-2xl font-semibold">Featured Section</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/60">
        Albums shown in the &ldquo;Featured&rdquo; grid on the home page. Drag
        to reorder. Toggle an entry to hide it without removing it. When the
        list is empty the home page falls back to the three most-recently
        released albums.
      </p>

      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <FeaturedManager initialEntries={entries} albums={albums} />
      )}
    </main>
  );
}
