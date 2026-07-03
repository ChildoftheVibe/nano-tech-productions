import { supabaseAdmin } from "@/lib/db/admin";
import { IntroVideoManager, type IntroEntry, type AlbumOption } from "./IntroVideoManager";

export const dynamic = "force-dynamic";

type IntroRow = {
  id: string;
  portrait_url: string | null;
  portrait_public_id: string | null;
  landscape_url: string | null;
  landscape_public_id: string | null;
  album_id: string | null;
  replay_mode: string;
  is_active: boolean;
  created_at: string;
};

export default async function AdminIntroPage() {
  const [{ data: rows, error }, { data: albumRows }] = await Promise.all([
    supabaseAdmin
      .from("intro_videos")
      .select(
        "id, portrait_url, portrait_public_id, landscape_url, landscape_public_id, album_id, replay_mode, is_active, created_at",
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("albums")
      .select("id, title, slug")
      .order("title", { ascending: true }),
  ]);

  const entries: IntroEntry[] = ((rows ?? []) as IntroRow[]).map((r) => ({
    id: r.id,
    portraitUrl: r.portrait_url,
    portraitPublicId: r.portrait_public_id,
    landscapeUrl: r.landscape_url,
    landscapePublicId: r.landscape_public_id,
    albumId: r.album_id,
    replayMode: r.replay_mode === "always" ? "always" : "session",
    isActive: r.is_active,
    createdAt: r.created_at,
  }));

  const albums: AlbumOption[] = (
    (albumRows ?? []) as Array<{ id: string; title: string; slug: string }>
  ).map((a) => ({ id: a.id, title: a.title, slug: a.slug }));

  return (
    <main className="p-8">
      <h1 className="mb-2 text-2xl font-semibold">Intro Video</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/60">
        A full-screen video that plays when a visitor lands on the site. Upload a{" "}
        <strong>9:16 portrait</strong> version for mobile and a{" "}
        <strong>16:9 landscape</strong> version for desktop, then choose the album
        the visitor is taken to when the video finishes or they tap the X. Only one
        intro can be active at a time.
      </p>

      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <IntroVideoManager initialEntries={entries} albums={albums} />
      )}
    </main>
  );
}
