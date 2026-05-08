import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let trackId: string | undefined;
  try {
    const body = (await req.json()) as { trackId?: string };
    trackId = body.trackId;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!trackId || typeof trackId !== "string") {
    return NextResponse.json({ ok: false, error: "missing_track_id" }, { status: 400 });
  }

  // Fire-and-forget — kick off without awaiting so the client gets a fast response.
  void supabaseAdmin
    .rpc("increment_play_count", { track_id: trackId })
    .then(({ error }) => {
      if (error) console.error("[api/tracks/played]", error.message);
    });

  return NextResponse.json({ ok: true }, { status: 202 });
}
