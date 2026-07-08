import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";

export const runtime = "nodejs";
export const revalidate = 60;

/**
 * Live casino UI theme, written by the ui-implementer agent and read by
 * GameShell. Lets research findings roll out to every table without a deploy.
 */
export async function GET() {
  const { data } = await supabaseAdmin
    .from("game_ui_config")
    .select("config, updated_at")
    .eq("id", 1)
    .maybeSingle();
  return NextResponse.json(
    { config: data?.config ?? {}, updatedAt: data?.updated_at ?? null },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
