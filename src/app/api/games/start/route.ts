import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/db/admin";
import { adjustBalance, gameById, getOrCreateWallet } from "@/lib/nanoBucks";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

type Body = { gameId?: string; stake?: number };

/**
 * Open a game round. Casino rounds debit the stake immediately; arcade rounds
 * are free. Returns the session id the client must present to settle.
 */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "game_start",
    maxAttempts: 60,
    windowMinutes: 5,
  });
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: noStore });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }

  const game = gameById(String(body.gameId ?? ""));
  if (!game) {
    return NextResponse.json({ error: "unknown_game" }, { status: 400, headers: noStore });
  }

  try {
    const wallet = await getOrCreateWallet();
    let stake = 0;

    if (game.mode === "casino") {
      // Preview deployments skip the wallet-login requirement so testers can
      // place bets without the OTP round-trip; production is unaffected.
      const isPreview = process.env.VERCEL_ENV === "preview";
      if (!wallet.email && !isPreview) {
        return NextResponse.json({ error: "login_required" }, { status: 403, headers: noStore });
      }
      stake = Math.round(Number(body.stake));
      if (
        !Number.isFinite(stake) ||
        stake < (game.minStake ?? 1) ||
        stake > (game.maxStake ?? 100)
      ) {
        return NextResponse.json({ error: "invalid_stake" }, { status: 400, headers: noStore });
      }
      if (stake > wallet.balance) {
        return NextResponse.json({ error: "insufficient_funds" }, { status: 400, headers: noStore });
      }
    }

    const { data: session, error } = await supabaseAdmin
      .from("game_sessions")
      .insert({
        wallet_id: wallet.id,
        game_id: game.id,
        mode: game.mode,
        stake,
        server_seed: randomBytes(16).toString("hex"),
      })
      .select("id")
      .single();
    if (error || !session) throw error ?? new Error("session_insert_failed");

    let balance = wallet.balance;
    if (stake > 0) {
      balance = await adjustBalance(wallet.id, -stake, "bet_stake", session.id, {
        game: game.id,
      });
    }

    return NextResponse.json(
      { sessionId: session.id, balance },
      { headers: noStore },
    );
  } catch (err) {
    logError(err, { caller: "game_start" });
    const msg = err instanceof Error && err.message === "insufficient_funds"
      ? "insufficient_funds"
      : "game_start_failed";
    return NextResponse.json(
      { error: msg },
      { status: msg === "insufficient_funds" ? 400 : 500, headers: noStore },
    );
  }
}
