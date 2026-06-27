import { supabaseAdmin } from "@/lib/db/admin";
import type { Album } from "@/lib/db-types";
import { AlbumsManager, type AlbumWithTrackCount } from "./AlbumsManager";

export const dynamic = "force-dynamic";

const ADMIN_PAGE_SIZE = 25;

type SearchParams = Promise<{ page?: string }>;

export default async function AdminAlbumsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1") || 1);
  const start = (page - 1) * ADMIN_PAGE_SIZE;
  const end = start + ADMIN_PAGE_SIZE - 1;

  const { data, count, error } = await supabaseAdmin
    .from("albums")
    .select("*, tracks(id)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, end);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  type Row = Album & { tracks?: Array<{ id: string }> | null };
  const rows: AlbumWithTrackCount[] = ((data ?? []) as Row[]).map((r) => {
    const { tracks, ...album } = r;
    return { ...(album as Album), track_count: tracks?.length ?? 0 };
  });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Manage Albums</h1>
      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <AlbumsManager
          initialAlbums={rows}
          page={page}
          totalPages={totalPages}
          totalCount={total}
        />
      )}
    </main>
  );
}
