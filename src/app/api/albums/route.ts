import { NextResponse } from "next/server";
import { getAlbums } from "@/lib/queries";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20),
  );
  const result = await getAlbums({ page, limit, published: true });
  return NextResponse.json(result);
}
