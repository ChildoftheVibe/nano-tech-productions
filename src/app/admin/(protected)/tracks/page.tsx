import { supabaseAdmin } from "@/lib/supabase";
import type { Album, Track } from "@/lib/db-types";
import { TracksManager } from "./TracksManager";

export const dynamic = "force-dynamic";

export default async function AdminTracksPage() {
  const [tracksRes, albumsRes] = await Promise.all([
    supabaseAdmin
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("albums")
      .select("id, title")
      .order("title", { ascending: true }),
  ]);

  const error = tracksRes.error ?? albumsRes.error;

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Manage Tracks</h1>
      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <TracksManager
          initialTracks={(tracksRes.data ?? []) as Track[]}
          albums={(albumsRes.data ?? []) as Pick<Album, "id" | "title">[]}
        />
      )}
    </main>
  );
}
