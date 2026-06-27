import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/db/admin";
import {
  createPayPalOrder,
  isPayPalConfigured,
  PayPalError,
  type PayPalLineItem,
} from "@/lib/paypal";
import { validateDiscount, type DiscountCheckItem } from "@/lib/discounts";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

type IncomingItem = {
  id?: string;
  kind?: "track" | "album";
  name?: string;
  price?: number;
  albumId?: string;
};

type Body = {
  items?: IncomingItem[];
  discountCode?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function POST(req: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: "paypal_not_configured" },
      { status: 503, headers: noStore },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((i) => ({
      id: typeof i.id === "string" ? i.id : "",
      kind: i.kind === "album" ? "album" : "track",
      name: typeof i.name === "string" ? i.name.slice(0, 127) : "",
      price: Number(i.price ?? 0),
      albumId: typeof i.albumId === "string" ? i.albumId : undefined,
    }))
    .filter((i) => i.id && i.name && Number.isFinite(i.price) && i.price > 0);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "no_valid_items" },
      { status: 400, headers: noStore },
    );
  }

  // Authoritative price lookup — never trust the client's price field.
  const trackIds = items.filter((i) => i.kind === "track").map((i) => i.id);
  const albumIds = items.filter((i) => i.kind === "album").map((i) => i.id);

  const trackRows = trackIds.length
    ? await supabaseAdmin
        .from("tracks")
        .select("id, title, price, is_published")
        .in("id", trackIds)
    : { data: [], error: null };
  const albumRows = albumIds.length
    ? await supabaseAdmin
        .from("albums")
        .select("id, title, is_published")
        .in("id", albumIds)
    : { data: [], error: null };

  if (trackRows.error || albumRows.error) {
    return NextResponse.json(
      { error: "lookup_failed" },
      { status: 500, headers: noStore },
    );
  }

  const trackById = new Map((trackRows.data ?? []).map((t) => [t.id as string, t]));
  const albumById = new Map((albumRows.data ?? []).map((a) => [a.id as string, a]));

  // Album price is fixed at $9.99 unless customized later.
  const ALBUM_PRICE = 9.99;

  const lineItems: PayPalLineItem[] = [];
  let subtotal = 0;
  for (const i of items) {
    if (i.kind === "track") {
      const row = trackById.get(i.id);
      if (!row || !row.is_published) {
        return NextResponse.json(
          { error: "track_unavailable" },
          { status: 400, headers: noStore },
        );
      }
      const price = Number(row.price);
      subtotal += price;
      lineItems.push({
        name: (row.title as string) ?? "Track",
        unit_amount: { currency_code: "USD", value: price.toFixed(2) },
        quantity: "1",
      });
    } else {
      const row = albumById.get(i.id);
      if (!row || !row.is_published) {
        return NextResponse.json(
          { error: "album_unavailable" },
          { status: 400, headers: noStore },
        );
      }
      subtotal += ALBUM_PRICE;
      lineItems.push({
        name: (row.title as string) ?? "Album",
        unit_amount: { currency_code: "USD", value: ALBUM_PRICE.toFixed(2) },
        quantity: "1",
      });
    }
  }

  subtotal = round2(subtotal);

  let discountAmount = 0;
  let discountApplied: { code: string; percent: number; amount: number } | null = null;
  if (body.discountCode) {
    const checkItems: DiscountCheckItem[] = items.map((i) => ({
      id: i.id,
      kind: i.kind as "track" | "album",
      albumId: i.albumId,
    }));
    const dr = await validateDiscount(body.discountCode, subtotal, checkItems);
    if (dr.valid) {
      discountAmount = dr.discountAmount;
      discountApplied = {
        code: dr.code,
        percent: dr.discountPercent,
        amount: dr.discountAmount,
      };
    }
  }

  const total = Math.max(0, round2(subtotal - discountAmount));

  // Encode discount/subtotal as a top-line "discount" line if any. PayPal v2
  // breakdowns get strict — easier to send a single corrected unit total.
  const ip = clientIpFromHeaders(req.headers);
  try {
    const order = await createPayPalOrder({
      total,
      currency: "USD",
      description: discountApplied
        ? `NTV Vault — code ${discountApplied.code}`
        : "NTV Vault purchase",
      items: discountApplied ? undefined : lineItems,
    });

    await logAuditEvent({
      eventType: "checkout_order_created",
      performedBy: ip,
      ipAddress: ip,
      metadata: {
        paypal_order_id: order.id,
        subtotal,
        discount: discountApplied,
        total,
        items: items.map((i) => ({ id: i.id, kind: i.kind })),
      },
    });

    // H6: Sign the orderId so /api/paypal/verify can confirm it was server-issued.
    const nonceSig = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
      .update(order.id)
      .digest("hex");
    const response = NextResponse.json(
      { orderId: order.id, subtotal, total, discountApplied },
      { headers: noStore },
    );
    response.cookies.set("ntv-co-nonce", nonceSig, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 30 * 60,
      path: "/",
    });
    return response;
  } catch (err) {
    const message = err instanceof PayPalError ? err.code : "create_failed";
    await logAuditEvent({
      eventType: "checkout_order_failed",
      performedBy: ip,
      ipAddress: ip,
      metadata: { reason: message },
    });
    return NextResponse.json({ error: message }, { status: 500, headers: noStore });
  }
}
