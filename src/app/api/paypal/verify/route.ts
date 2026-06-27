import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/db/admin";
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
import { sendAdminNewOrderAlert, sendOrderConfirmation } from "@/lib/email";
import type {
  EmailDownload,
  EmailItem,
  EmailStreaming,
} from "@/components/email/OrderConfirmation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };
const round2 = (n: number) => Math.round(n * 100) / 100;
const ALBUM_PRICE = 9.99;

type IncomingItem = {
  id: string;
  kind: "track" | "album" | "instrumental";
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

  // H6: Verify the orderId was issued by our server via HMAC-signed cookie.
  const jar = await cookies();
  const cookieNonce = jar.get("ntv-co-nonce")?.value;
  if (cookieNonce) {
    const expected = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
      .update(body.orderId)
      .digest("hex");
    const a = Buffer.from(cookieNonce, "hex");
    const b = Buffer.from(expected, "hex");
    const nonceValid = a.length === b.length && timingSafeEqual(a, b);
    if (!nonceValid) {
      return NextResponse.json(
        { verified: false, error: "nonce_invalid" },
        { status: 400, headers: noStore },
      );
    }
    // Clear the nonce — single-use.
    jar.delete("ntv-co-nonce");
  }

  const ip = clientIpFromHeaders(req.headers);

  // Idempotency: if we already saved this PayPal order, surface the same tokens.
  const { data: existingOrder } = await supabaseAdmin
    .from("orders")
    .select("id, status")
    .eq("paypal_order_id", body.orderId)
    .maybeSingle();
  if (existingOrder?.status === "completed") {
    const [tracksTokens, instrumentalsTokens] = await Promise.all([
      supabaseAdmin
        .from("download_tokens")
        .select("token, track_id")
        .eq("order_id", existingOrder.id),
      supabaseAdmin
        .from("instrumental_download_tokens")
        .select("token, instrumental_id")
        .eq("order_id", existingOrder.id),
    ]);
    const origin = siteOrigin(req);
    const downloadUrls = [
      ...(tracksTokens.data ?? []).map(
        (t) => `${origin}/api/download/${t.token}`,
      ),
      ...(instrumentalsTokens.data ?? []).map(
        (t) => `${origin}/api/download/instrumental/${t.token}`,
      ),
    ];
    return NextResponse.json(
      {
        verified: true,
        downloadUrls,
        replay: true,
      },
      { headers: noStore },
    );
  }

  // Re-resolve & price the cart server-side; never trust the client's prices.
  const items = (body.items ?? []).filter(
    (i) =>
      i &&
      (i.kind === "track" || i.kind === "album" || i.kind === "instrumental") &&
      typeof i.id === "string",
  );
  if (!items.length) {
    return NextResponse.json(
      { verified: false, error: "no_items" },
      { status: 400, headers: noStore },
    );
  }

  const trackIds = items.filter((i) => i.kind === "track").map((i) => i.id);
  const albumIds = items.filter((i) => i.kind === "album").map((i) => i.id);
  const instrumentalIds = items
    .filter((i) => i.kind === "instrumental")
    .map((i) => i.id);

  const [trackRows, albumRows, albumTracks, instrumentalRows] = await Promise.all([
    trackIds.length
      ? supabaseAdmin
          .from("tracks")
          .select("id, album_id, title, price, is_published, is_downloadable")
          .in("id", trackIds)
      : Promise.resolve({ data: [], error: null }),
    albumIds.length
      ? supabaseAdmin
          .from("albums")
          .select(
            "id, title, is_published, spotify_url, apple_music_url, youtube_url, amazon_url",
          )
          .in("id", albumIds)
      : Promise.resolve({ data: [], error: null }),
    albumIds.length
      ? supabaseAdmin
          .from("tracks")
          .select("id, album_id, is_published, is_downloadable")
          .in("album_id", albumIds)
          .eq("is_published", true)
      : Promise.resolve({ data: [], error: null }),
    instrumentalIds.length
      ? supabaseAdmin
          .from("instrumentals")
          .select("id, title, price, is_published, is_downloadable")
          .in("id", instrumentalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (
    trackRows.error ||
    albumRows.error ||
    albumTracks.error ||
    instrumentalRows.error
  ) {
    return NextResponse.json(
      { verified: false, error: "lookup_failed" },
      { status: 500, headers: noStore },
    );
  }

  const trackById = new Map((trackRows.data ?? []).map((t) => [t.id as string, t]));
  const albumById = new Map((albumRows.data ?? []).map((a) => [a.id as string, a]));
  const instrumentalById = new Map(
    (instrumentalRows.data ?? []).map((i) => [i.id as string, i]),
  );
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
  const purchasedInstrumentalIds: string[] = [];
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
    } else if (i.kind === "album") {
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
    } else {
      const row = instrumentalById.get(i.id);
      if (!row || !row.is_published) {
        return NextResponse.json(
          { verified: false, error: "instrumental_unavailable" },
          { status: 400, headers: noStore },
        );
      }
      subtotal += Number(row.price);
      if (row.is_downloadable) purchasedInstrumentalIds.push(row.id as string);
    }
  }
  subtotal = round2(subtotal);

  let discountAmount = 0;
  let discountCodeId: string | null = null;
  let discountCodeText: string | null = null;
  if (body.discountCode) {
    // Discount codes only target tracks/albums today. Instrumentals are
    // eligible for `applies_to = 'all'` codes through the subtotal but
    // shouldn't appear in the per-item targeting list.
    const checkItems: DiscountCheckItem[] = items
      .filter((i): i is IncomingItem & { kind: "track" | "album" } =>
        i.kind === "track" || i.kind === "album",
      )
      .map((i) => ({
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
  const emailDownloads: EmailDownload[] = [];
  if (purchasedTrackIds.length) {
    const tokenRows = purchasedTrackIds.map((tid) => ({
      order_id: orderRowId,
      track_id: tid,
      format: "mp3_320",
    }));
    const { data: tokens, error: tokErr } = await supabaseAdmin
      .from("download_tokens")
      .insert(tokenRows)
      .select("token, track_id");
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
      for (const t of tokens ?? []) {
        const track = trackById.get(t.track_id as string);
        emailDownloads.push({
          trackName: track?.title ?? "Track",
          url: `${origin}/api/download/${t.token}`,
        });
      }
    }
  }

  if (purchasedInstrumentalIds.length) {
    const tokenRows = purchasedInstrumentalIds.map((iid) => ({
      order_id: orderRowId,
      instrumental_id: iid,
      format: "mp3_320",
    }));
    const { data: tokens, error: tokErr } = await supabaseAdmin
      .from("instrumental_download_tokens")
      .insert(tokenRows)
      .select("token, instrumental_id");
    if (tokErr) {
      await logAuditEvent({
        eventType: "checkout_instrumental_token_mint_failed",
        performedBy: ip,
        ipAddress: ip,
        metadata: { reason: tokErr.message, order_id: orderRowId },
      });
    } else {
      const origin = siteOrigin(req);
      for (const t of tokens ?? []) {
        downloadUrls.push(`${origin}/api/download/instrumental/${t.token}`);
        const inst = instrumentalById.get(t.instrumental_id as string);
        emailDownloads.push({
          trackName: inst?.title ?? "Instrumental",
          url: `${origin}/api/download/instrumental/${t.token}`,
        });
      }
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

  // Build email payloads from server-validated data.
  const emailItems: EmailItem[] = items.map((i) => {
    if (i.kind === "track") {
      const row = trackById.get(i.id);
      return {
        name: row?.title ?? i.name,
        kind: "track" as const,
        price: row ? Number(row.price) : 0,
      };
    }
    if (i.kind === "instrumental") {
      const row = instrumentalById.get(i.id);
      return {
        name: row?.title ?? i.name,
        kind: "instrumental" as const,
        price: row ? Number(row.price) : 0,
      };
    }
    const row = albumById.get(i.id);
    return {
      name: row?.title ?? i.name,
      kind: "album" as const,
      price: ALBUM_PRICE,
    };
  });

  const emailStreaming: EmailStreaming[] = items
    .filter((i) => i.kind === "album")
    .map((i) => {
      const row = albumById.get(i.id) as
        | {
            title: string;
            spotify_url: string | null;
            apple_music_url: string | null;
            youtube_url: string | null;
            amazon_url: string | null;
          }
        | undefined;
      return {
        albumName: row?.title ?? i.name,
        spotify: row?.spotify_url ?? null,
        appleMusic: row?.apple_music_url ?? null,
        youtube: row?.youtube_url ?? null,
        amazon: row?.amazon_url ?? null,
      };
    })
    .filter(
      (s) => s.spotify || s.appleMusic || s.youtube || s.amazon,
    );

  // Fire customer + admin emails. Don't block the response on send outcomes.
  const orderNumber = orderRowId ?? body.orderId;
  const [customerSend, adminSend] = await Promise.all([
    customerEmail
      ? sendOrderConfirmation({
          to: customerEmail,
          orderNumber,
          items: emailItems,
          subtotal,
          discount: discountAmount,
          total,
          downloads: emailDownloads,
          streaming: emailStreaming,
        })
      : Promise.resolve({ sent: false as const, reason: "no_customer_email" }),
    sendAdminNewOrderAlert({
      orderNumber,
      total,
      items: emailItems,
      customerEmail,
    }),
  ]);

  await Promise.all([
    logAuditEvent({
      eventType: customerSend.sent
        ? "email_order_confirmation_sent"
        : "email_order_confirmation_failed",
      performedBy: customerEmail ?? ip,
      ipAddress: ip,
      entityType: "order",
      entityId: orderRowId ?? undefined,
      metadata: {
        recipient: customerEmail,
        ...(customerSend.sent
          ? { resend_id: customerSend.id }
          : { reason: customerSend.reason }),
      },
    }),
    logAuditEvent({
      eventType: adminSend.sent
        ? "email_admin_alert_sent"
        : "email_admin_alert_failed",
      performedBy: "system",
      ipAddress: ip,
      entityType: "order",
      entityId: orderRowId ?? undefined,
      metadata: adminSend.sent
        ? { resend_id: adminSend.id }
        : { reason: adminSend.reason },
    }),
  ]);

  return NextResponse.json(
    { verified: true, downloadUrls },
    { headers: noStore },
  );
}
