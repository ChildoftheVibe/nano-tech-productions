import { supabaseAdmin } from "@/lib/supabase";
import type { Album, Track } from "@/lib/db-types";
import { TracksManager } from "./TracksManager";

export const dynamic = "force-dynamic";

const ADMIN_PAGE_SIZE = 50;

type SearchParams = Promise<{ page?: string }>;

export default async function AdminTracksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1") || 1);
  const start = (page - 1) * ADMIN_PAGE_SIZE;
  const end = start + ADMIN_PAGE_SIZE - 1;

  const [tracksRes, albumsRes] = await Promise.all([
    supabaseAdmin
      .from("tracks")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end),
    supabaseAdmin
      .from("albums")
      .select("id, title")
      .order("title", { ascending: true }),
  ]);

  const error = tracksRes.error ?? albumsRes.error;
  const total = tracksRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Manage Tracks</h1>
      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <TracksManager
          initialTracks={(tracksRes.data ?? []) as Track[]}
          albums={(albumsRes.data ?? []) as Pick<Album, "id" | "title">[]}
          page={page}
          totalPages={totalPages}
          totalCount={total}
        />
      )}
    </main>
  );
}
