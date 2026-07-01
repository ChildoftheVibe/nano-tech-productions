import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type MediaEntry = {
  id: string;
  url: string;
  media_type: "image" | "video";
  position: number | null;
  caption: string | null;
};

async function getAlbumMedia(slug: string): Promise<MediaEntry[]> {
  // Resolve slug → album id
  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!album) return [];

  const { data } = await supabase
    .from("album_media")
    .select("id, url, media_type, position, caption")
    .eq("album_id", album.id)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  return (data ?? []) as MediaEntry[];
}

const getCachedAlbumMedia = unstable_cache(
  getAlbumMedia,
  ["album-media"],
  { revalidate: 300, tags: ["album-media"] },
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const media = await getCachedAlbumMedia(slug);
  return NextResponse.json({ media });
}
