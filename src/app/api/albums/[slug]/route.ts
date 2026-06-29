import { NextResponse } from "next/server";
import { getAlbum } from "@/lib/queries";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(album);
}
