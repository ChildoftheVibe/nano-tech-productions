import { supabaseAdmin } from "@/lib/supabase";
import { VaultClient, type VaultTrack } from "./VaultClient";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const [tracksRes, albumsRes] = await Promise.all([
    supabaseAdmin
      .from("tracks")
      .select(
        "id, title, track_number, vault_audio_id, wav_checksum, wav_file_size_mb, download_count, album_id, created_at",
      )
      .not("vault_audio_id", "is", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("albums").select("id, title"),
  ]);

  const error = tracksRes.error ?? albumsRes.error;
  const albumTitleById = new Map(
    (albumsRes.data ?? []).map((a) => [a.id as string, a.title as string]),
  );

  const accessRows = await supabaseAdmin
    .from("audit_log")
    .select("entity_id, event_type, created_at")
    .in("event_type", ["admin_wav_access", "admin_wav_download"])
    .order("created_at", { ascending: false })
    .limit(2000);

  const accessSummary = new Map<string, { lastAccessed: string; count: number }>();
  for (const row of accessRows.data ?? []) {
    if (!row.entity_id) continue;
    const summary = accessSummary.get(row.entity_id) ?? { lastAccessed: row.created_at, count: 0 };
    if (row.created_at > summary.lastAccessed) summary.lastAccessed = row.created_at;
    summary.count += 1;
    accessSummary.set(row.entity_id, summary);
  }

  const tracks: VaultTrack[] = (tracksRes.data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    trackNumber: (t.track_number as number) ?? 0,
    albumTitle: t.album_id ? albumTitleById.get(t.album_id as string) ?? "—" : "—",
    checksum: (t.wav_checksum as string | null) ?? null,
    sizeMb: (t.wav_file_size_mb as number | null) ?? null,
    uploadedAt: t.created_at as string,
    downloadCount: (t.download_count as number) ?? 0,
    lastAccessedAt: accessSummary.get(t.id as string)?.lastAccessed ?? null,
    accessCount: accessSummary.get(t.id as string)?.count ?? 0,
  }));

  return (
    <main className="p-8">
      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <VaultClient tracks={tracks} />
      )}
    </main>
  );
}
