import { supabaseAdmin } from "@/lib/db/admin";
import { HeroManager, type HeroEntry } from "./HeroManager";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
  const { data, error } = await supabaseAdmin
    .from("hero_media")
    .select("id, url, public_id, media_type, is_active, created_at")
    .order("created_at", { ascending: false });

  type HeroRow = {
    id: string;
    url: string;
    public_id: string;
    media_type: string;
    is_active: boolean;
    created_at: string;
  };

  const entries: HeroEntry[] = ((data ?? []) as HeroRow[]).map((r) => ({
    id: r.id,
    url: r.url,
    publicId: r.public_id,
    mediaType: r.media_type as "image" | "video",
    isActive: r.is_active,
    createdAt: r.created_at,
  }));

  return (
    <main className="p-8">
      <h1 className="mb-2 text-2xl font-semibold">Hero Media</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/60">
        Upload images or videos to display as the home page hero background.
        Only one entry can be active at a time. When no media is active, the
        default Nano Tech logo is shown.
      </p>

      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <HeroManager initialEntries={entries} />
      )}
    </main>
  );
}
