import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lyrics are stripped from the playlist queue payload (see
// PLAYLIST_TRACK_COLUMNS in queries.ts) to keep every page's HTML small;
// LyricsModal fetches them here on demand.
const getTrackLyrics = unstable_cache(
  async (id: string): Promise<{ lyrics: string | null } | null> => {
    const { data } = await supabase
      .from("tracks")
      .select("lyrics")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    if (!data) return null;
    return { lyrics: data.lyrics ?? null };
  },
  ["track-lyrics"],
  { revalidate: 300, tags: ["tracks"] },
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimit({
    identifier: ip,
    action: "track_lyrics",
    maxAttempts: 60,
    windowMinutes: 1,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const result = await getTrackLyrics(id);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
