import { NextResponse } from "next/server";
import { getInstrumentals } from "@/lib/queries";
import type { InstrumentalType } from "@/types/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isType = (s: string | null): s is InstrumentalType =>
  s === "single" || s === "album_track";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const typeParam = url.searchParams.get("type");
  const albumId = url.searchParams.get("albumId") ?? undefined;

  const result = await getInstrumentals({
    page,
    limit,
    type: isType(typeParam) ? typeParam : undefined,
    albumId,
  });
  return NextResponse.json(result, {
    headers: { "cache-control": "public, max-age=60, s-maxage=300" },
  });
}
