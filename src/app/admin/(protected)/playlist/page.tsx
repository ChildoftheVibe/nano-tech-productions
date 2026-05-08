import { supabaseAdmin } from "@/lib/supabase";
import { PlaylistManager, type PlaylistEntry, type TrackOption } from "./PlaylistManager";

export const dynamic = "force-dynamic";

export default async function AdminPlaylistPage() {
  const [playlistRes, tracksRes] = await Promise.all([
    supabaseAdmin
      .from("playlist")
      .select("id, track_id, position, is_active")
      .order("position", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("tracks")
      .select("id, title, is_published, audio_url, album_id, albums(title)")
      .order("title", { ascending: true }),
  ]);

  const error = playlistRes.error ?? tracksRes.error;

  type TrackWithAlbumRow = {
    id: string;
    title: string;
    is_published: boolean;
    audio_url: string | null;
    album_id: string | null;
    albums: { title: string } | { title: string }[] | null;
  };

  const tracks: TrackOption[] = (
    (tracksRes.data ?? []) as TrackWithAlbumRow[]
  ).map((t) => {
    const album = Array.isArray(t.albums) ? t.albums[0] : t.albums;
    return {
      id: t.id,
      title: t.title,
      albumTitle: album?.title ?? null,
      isPublished: t.is_published,
      hasAudio: !!t.audio_url,
    };
  });

  const entries: PlaylistEntry[] = (
    (playlistRes.data ?? []) as Array<{
      id: string;
      track_id: string;
      position: number | null;
      is_active: boolean;
    }>
  ).map((e) => ({
    id: e.id,
    trackId: e.track_id,
    position: e.position,
    isActive: e.is_active,
  }));

  return (
    <main className="p-8">
      <h1 className="mb-2 text-2xl font-semibold">Playlist Manager</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/60">
        This is the continuous shuffle playlist that auto-plays when fans first
        open the site. Drag the handle to reorder. Inactive entries are skipped
        but kept for re-enabling later.
      </p>

      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <PlaylistManager initialEntries={entries} tracks={tracks} />
      )}
    </main>
  );
}
