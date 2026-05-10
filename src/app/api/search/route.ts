import { NextResponse } from "next/server";
import { searchContent } from "@/lib/queries";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json(
      { albums: [], tracks: [], artists: [], query: q, tooShort: true },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  const result = await searchContent(q);
  return NextResponse.json(
    { ...result, query: q, tooShort: false },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
