import { NextResponse } from "next/server";
import { getPlaylistTracks } from "@/lib/queries";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const result = await getPlaylistTracks();
  return NextResponse.json(result);
}
