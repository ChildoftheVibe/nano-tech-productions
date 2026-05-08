import { NextResponse } from "next/server";
import { validateDiscount, type DiscountCheckItem } from "@/lib/discounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

type Body = {
  code?: string;
  cartTotal?: number;
  items?: DiscountCheckItem[];
};

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }

  const cartTotal = Number(body.cartTotal);
  if (!Number.isFinite(cartTotal) || cartTotal < 0) {
    return NextResponse.json(
      { valid: false, discountPercent: 0, discountAmount: 0, message: "Invalid cart total." },
      { headers: noStore },
    );
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const result = await validateDiscount(body.code ?? "", cartTotal, items);

  // Strip server-only fields before returning to client.
  if (result.valid) {
    return NextResponse.json(
      {
        valid: true,
        discountPercent: result.discountPercent,
        discountAmount: result.discountAmount,
        message: result.message,
      },
      { headers: noStore },
    );
  }
  return NextResponse.json(result, { headers: noStore });
}
