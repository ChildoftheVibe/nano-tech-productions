import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { adjustBalance, getWallet } from "@/lib/nanoBucks";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders, logAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

type Body = { kind?: "track" | "album"; id?: string };

const siteOrigin = (req: Request): string => {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
};

/**
 * Spend Nano Bucks on a track or album download. The NB price is always read
 * from the DB (rule #4: never trust client prices); on success the wallet is
 * debited and single-use download tokens are minted exactly like a PayPal
 * purchase.
 */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "wallet_redeem",
    maxAttempts: 20,
    windowMinutes: 10,
  });
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: noStore });
  }

  const wallet = await getWallet();
  if (!wallet) {
    return NextResponse.json({ error: "no_wallet" }, { status: 401, headers: noStore });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }
  const id = String(body.id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id) || (body.kind !== "track" && body.kind !== "album")) {
    return NextResponse.json({ error: "invalid_item" }, { status: 400, headers: noStore });
  }

  try {
    let nbPrice: number | null = null;
    let trackIds: string[] = [];
    let itemName = "";

    if (body.kind === "track") {
      const { data: track } = await supabaseAdmin
        .from("tracks")
        .select("id, title, nb_price, is_published")
        .eq("id", id)
        .maybeSingle();
      if (!track || !track.is_published) {
        return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
      }
      nbPrice = track.nb_price;
      trackIds = [track.id];
      itemName = track.title;
    } else {
      const { data: album } = await supabaseAdmin
        .from("albums")
        .select("id, title, nb_price, is_published, tracks(id, is_published)")
        .eq("id", id)
        .maybeSingle();
      if (!album || !album.is_published) {
        return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
      }
      nbPrice = album.nb_price;
      trackIds = (album.tracks ?? [])
        .filter((t: { is_published: boolean }) => t.is_published)
        .map((t: { id: string }) => t.id);
      itemName = album.title;
    }

    if (nbPrice == null || nbPrice <= 0) {
      return NextResponse.json({ error: "not_redeemable" }, { status: 400, headers: noStore });
    }
    if (trackIds.length === 0) {
      return NextResponse.json({ error: "no_tracks" }, { status: 400, headers: noStore });
    }
    if (nbPrice > wallet.balance) {
      return NextResponse.json(
        { error: "insufficient_funds", needed: nbPrice, balance: wallet.balance },
        { status: 400, headers: noStore },
      );
    }

    const balance = await adjustBalance(
      wallet.id,
      -nbPrice,
      body.kind === "track" ? "redeem_track" : "redeem_album",
      id,
      { name: itemName },
    );

    const { data: tokens, error: tokErr } = await supabaseAdmin
      .from("download_tokens")
      .insert(trackIds.map((tid) => ({ track_id: tid, format: "mp3_320" })))
      .select("token, track_id");
    if (tokErr || !tokens?.length) {
      // Refund — the visitor paid but got no downloads.
      await adjustBalance(wallet.id, nbPrice, "admin_adjust", id, {
        reason: "redeem_token_mint_failed_refund",
      });
      logError(tokErr ?? new Error("no_tokens"), { caller: "wallet_redeem" });
      return NextResponse.json({ error: "redeem_failed" }, { status: 500, headers: noStore });
    }

    await logAuditEvent({
      eventType: "nano_bucks_redeem",
      performedBy: wallet.wallet_code,
      ipAddress: ip,
      metadata: { kind: body.kind, id, name: itemName, nbPrice },
    });

    const origin = siteOrigin(req);
    return NextResponse.json(
      {
        ok: true,
        spent: nbPrice,
        balance,
        downloads: tokens.map((t) => ({
          trackId: t.track_id,
          url: `${origin}/api/download/${t.token}`,
        })),
      },
      { headers: noStore },
    );
  } catch (err) {
    logError(err, { caller: "wallet_redeem" });
    const insufficient = err instanceof Error && err.message === "insufficient_funds";
    return NextResponse.json(
      { error: insufficient ? "insufficient_funds" : "redeem_failed" },
      { status: insufficient ? 400 : 500, headers: noStore },
    );
  }
}
