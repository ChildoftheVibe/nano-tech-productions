import { supabaseAdmin } from "@/lib/supabase";
import type { Album } from "@/lib/db-types";
import { AlbumsManager } from "./AlbumsManager";

export const dynamic = "force-dynamic";

export default async function AdminAlbumsPage() {
  const { data, error } = await supabaseAdmin
    .from("albums")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Manage Albums</h1>
      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <AlbumsManager initialAlbums={(data ?? []) as Album[]} />
      )}
    </main>
  );
}
