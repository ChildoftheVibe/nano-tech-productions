import { supabaseAdmin } from "@/lib/db/admin";
import type { Album, Instrumental } from "@/lib/db-types";
import { SoundsManager } from "./SoundsManager";

export const dynamic = "force-dynamic";

const ADMIN_PAGE_SIZE = 50;

type SearchParams = Promise<{
  page?: string;
  album?: string;
  type?: string;
}>;

export default async function AdminSoundsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page: pageStr, album: albumFilter, type: typeFilter } =
    await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1") || 1);
  const start = (page - 1) * ADMIN_PAGE_SIZE;
  const end = start + ADMIN_PAGE_SIZE - 1;

  let q = supabaseAdmin
    .from("instrumentals")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, end);

  if (typeFilter === "single" || typeFilter === "album_track") {
    q = q.eq("type", typeFilter);
  }
  if (albumFilter === "none") {
    q = q.is("album_id", null);
  } else if (albumFilter && albumFilter.length > 0) {
    q = q.eq("album_id", albumFilter);
  }

  const [instrumentalsRes, albumsRes] = await Promise.all([
    q,
    supabaseAdmin
      .from("albums")
      .select("id, title, slug")
      .order("title", { ascending: true }),
  ]);

  const error = instrumentalsRes.error ?? albumsRes.error;
  const total = instrumentalsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Manage Sounds</h1>
      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <SoundsManager
          initial={(instrumentalsRes.data ?? []) as Instrumental[]}
          albums={(albumsRes.data ?? []) as Pick<Album, "id" | "title" | "slug">[]}
          page={page}
          totalPages={totalPages}
          totalCount={total}
          albumFilter={albumFilter ?? ""}
          typeFilter={(typeFilter as "" | "single" | "album_track") ?? ""}
        />
      )}
    </main>
  );
}
