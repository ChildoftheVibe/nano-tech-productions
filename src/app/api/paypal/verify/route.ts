import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  capturePayPalOrder,
  isPayPalConfigured,
  PayPalError,
} from "@/lib/paypal";
import {
  validateDiscount,
  incrementDiscountUsage,
  type DiscountCheckItem,
} from "@/lib/discounts";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };
const round2 = (n: number) => Math.round(n * 100) / 100;
const ALBUM_PRICE = 9.99;

type IncomingItem = {
  id: string;
  kind: "track" | "album";
  name: string;
  price?: number;
  albumId?: string;
};

type Body = {
  orderId?: string;
  items?: IncomingItem[];
  discountCode?: string;
  customerEmail?: string;
};

const siteOrigin = (req: Request): string => {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
};

export async function POST(req: Request) {
  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { verified: false, error: "paypal_not_configured" },
      { status: 503, headers: noStore },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { verified: false, error: "invalid_body" },
      { status: 400, headers: noStore },
    );
  }

  if (!body.orderId || typeof body.orderId !== "string") {
    return NextResponse.json(
      { verified: false, error: "missing_order_id" },
      { status: 400, headers: noStore },
    );
  }
  const ip = clientIpFromHeaders(req.headers);

  // Idempotency: if we already saved this PayPal order, surface the same tokens.
  const { data: existingOrder } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("paypal_order_id", body.orderId)
    .maybeSingle();
  if (existingOrder?.status === "completed") {
    const { data: tokens } = await supabaseAdmin
      .from("download_tokens")
      .select("token, track_id")
      .eq("order_id", existingOrder.id);
    const origin = siteOrigin(req);
    return NextResponse.json(
      {
        verified: true,
        downloadUrls: (tokens ?? []).map((t) => `${origin}/api/download/${t.token}`),
        replay: true,
      },
      { headers: noStore },
    );
  }

  // Re-resolve & price the cart server-side; never trust the client's prices.
  const items = (body.items ?? []).filter(
    (i) => i && (i.kind === "track" || i.kind === "album") && typeof i.id === "string",
  );
  if (!items.length) {
    return NextResponse.json(
      { verified: false, error: "no_items" },
      { status: 400, headers: noStore },
    );
  }

  const trackIds = items.filter((i) => i.kind === "track").map((i) => i.id);
  const albumIds = items.filter((i) => i.kind === "album").map((i) => i.id);

  const [trackRows, albumRows, albumTracks] = await Promise.all([
    trackIds.length
      ? supabaseAdmin
          .from("tracks")
          .select("id, album_id, title, price, is_published, is_downloadable")
          .in("id", trackIds)
      : Promise.resolve({ data: [], error: null }),
    albumIds.length
      ? supabaseAdmin
          .from("albums")
          .select("id, title, is_published")
          .in("id", albumIds)
      : Promise.resolve({ data: [], error: null }),
    albumIds.length
      ? supabaseAdmin
          .from("tracks")
          .select("id, album_id, is_published, is_downloadable")
          .in("album_id", albumIds)
          .eq("is_published", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (trackRows.error || albumRows.error || albumTracks.error) {
    return NextResponse.json(
      { verified: false, error: "lookup_failed" },
      { status: 500, headers: noStore },
    );
  }

  const trackById = new Map((trackRows.data ?? []).map((t) => [t.id as string, t]));
  const albumById = new Map((albumRows.data ?? []).map((a) => [a.id as string, a]));
  const albumTrackIds = new Map<string, string[]>();
  for (const row of albumTracks.data ?? []) {
    const aid = row.album_id as string;
    if (!aid) continue;
    const list = albumTrackIds.get(aid) ?? [];
    if (row.is_downloadable) list.push(row.id as string);
    albumTrackIds.set(aid, list);
  }

  let subtotal = 0;
  const purchasedTrackIds: string[] = [];
  for (const i of items) {
    if (i.kind === "track") {
      const row = trackById.get(i.id);
      if (!row || !row.is_published) {
        return NextResponse.json(
          { verified: false, error: "track_unavailable" },
          { status: 400, headers: noStore },
        );
      }
      subtotal += Number(row.price);
      if (row.is_downloadable) purchasedTrackIds.push(row.id as string);
    } else {
      const row = albumById.get(i.id);
      if (!row || !row.is_published) {
        return NextResponse.json(
          { verified: false, error: "album_unavailable" },
          { status: 400, headers: noStore },
        );
      }
      subtotal += ALBUM_PRICE;
      const ids = albumTrackIds.get(i.id) ?? [];
      purchasedTrackIds.push(...ids);
    }
  }
  subtotal = round2(subtotal);

  let discountAmount = 0;
  let discountCodeId: string | null = null;
  let discountCodeText: string | null = null;
  if (body.discountCode) {
    const checkItems: DiscountCheckItem[] = items.map((i) => ({
      id: i.id,
      kind: i.kind,
      albumId: i.albumId,
    }));
    const dr = await validateDiscount(body.discountCode, subtotal, checkItems);
    if (dr.valid) {
      discountAmount = dr.discountAmount;
      discountCodeId = dr.codeId;
      discountCodeText = dr.code;
    }
  }
  const total = Math.max(0, round2(subtotal - discountAmount));

  // Capture payment with PayPal.
  let capture;
  try {
    capture = await capturePayPalOrder(body.orderId);
  } catch (err) {
    const code = err instanceof PayPalError ? err.code : "capture_failed";
    await logAuditEvent({
      eventType: "checkout_capture_failed",
      performedBy: ip,
      ipAddress: ip,
      metadata: { paypal_order_id: body.orderId, reason: code },
    });
    return NextResponse.json(
      { verified: false, error: code },
      { status: 502, headers: noStore },
    );
  }

  if (capture.status !== "COMPLETED") {
    await logAuditEvent({
      eventType: "checkout_capture_rejected",
      performedBy: ip,
      ipAddress: ip,
      metadata: { paypal_order_id: body.orderId, status: capture.status },
    });
    return NextResponse.json(
      { verified: false, error: "not_completed" },
      { status: 402, headers: noStore },
    );
  }

  // Sanity-check the captured amount matches our re-priced total.
  const capturedAmount = Number(capture.amountValue ?? "0");
  if (!Number.isFinite(capturedAmount) || Math.abs(capturedAmount - total) > 0.01) {
    await logAuditEvent({
      eventType: "checkout_amount_mismatch",
      performedBy: ip,
      ipAddress: ip,
      metadata: {
        paypal_order_id: body.orderId,
        captured: capturedAmount,
        expected: total,
      },
    });
    return NextResponse.json(
      { verified: false, error: "amount_mismatch" },
      { status: 400, headers: noStore },
    );
  }

  // Persist order.
  const customerEmail =
    capture.payerEmail ??
    (typeof body.customerEmail === "string" ? body.customerEmail : null);

  const itemsJson = items.map((i) => ({
    id: i.id,
    kind: i.kind,
    name: i.name,
    albumId: i.albumId ?? null,
  }));

  let orderRowId: string | null = existingOrder?.id ?? null;
  if (orderRowId) {
    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        customer_email: customerEmail,
        items: itemsJson,
        subtotal,
        discount_amount: discountAmount,
        total,
        discount_code: discountCodeText,
      })
      .eq("id", orderRowId);
    if (updErr) {
      return NextResponse.json(
        { verified: false, error: "save_failed" },
        { status: 500, headers: noStore },
      );
    }
  } else {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("orders")
      .insert({
        paypal_order_id: body.orderId,
        customer_email: customerEmail,
        items: itemsJson,
        subtotal,
        discount_amount: discountAmount,
        total,
        discount_code: discountCodeText,
        status: "completed",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return NextResponse.json(
        { verified: false, error: "save_failed" },
        { status: 500, headers: noStore },
      );
    }
    orderRowId = inserted.id as string;
  }

  // Mint a download token per purchased track. Tokens default to 2-hour expiry
  // and gen_random_bytes server-side via DEFAULT.
  let downloadUrls: string[] = [];
  if (purchasedTrackIds.length) {
    const tokenRows = purchasedTrackIds.map((tid) => ({
      order_id: orderRowId,
      track_id: tid,
      format: "mp3_320",
    }));
    const { data: tokens, error: tokErr } = await supabaseAdmin
      .from("download_tokens")
      .insert(tokenRows)
      .select("token");
    if (tokErr) {
      // Order is captured & saved; fail soft on token minting so customer can re-fetch.
      await logAuditEvent({
        eventType: "checkout_token_mint_failed",
        performedBy: ip,
        ipAddress: ip,
        metadata: { reason: tokErr.message, order_id: orderRowId },
      });
    } else {
      const origin = siteOrigin(req);
      downloadUrls = (tokens ?? []).map(
        (t) => `${origin}/api/download/${t.token}`,
      );
    }
  }

  if (discountCodeId) {
    await incrementDiscountUsage(discountCodeId);
  }

  await logAuditEvent({
    eventType: "checkout_completed",
    performedBy: customerEmail ?? ip,
    ipAddress: ip,
    entityType: "order",
    entityId: orderRowId ?? undefined,
    metadata: {
      paypal_order_id: body.orderId,
      total,
      tracks: purchasedTrackIds.length,
    },
  });

  return NextResponse.json(
    { verified: true, downloadUrls },
    { headers: noStore },
  );
}
