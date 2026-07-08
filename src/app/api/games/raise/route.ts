import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { adjustBalance, gameById, getWallet } from "@/lib/nanoBucks";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

type Body = { sessionId?: string; amount?: number };

/**
 * Add to an open casino round's stake (blackjack double-down, hold'em call).
 * Total stake is capped at 2× the game's max single stake.
 */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "game_raise",
    maxAttempts: 60,
    windowMinutes: 5,
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
  const sessionId = String(body.sessionId ?? "");
  const amount = Math.round(Number(body.amount));
  if (!/^[0-9a-f-]{36}$/.test(sessionId) || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_raise" }, { status: 400, headers: noStore });
  }

  try {
    const { data: session } = await supabaseAdmin
      .from("game_sessions")
      .select("id, game_id, mode, stake, status")
      .eq("id", sessionId)
      .eq("wallet_id", wallet.id)
      .maybeSingle();
    if (!session || session.status !== "open" || session.mode !== "casino") {
      return NextResponse.json({ error: "session_not_open" }, { status: 409, headers: noStore });
    }
    const game = gameById(session.game_id);
    const cap = (game?.maxStake ?? 100) * 2;
    if (session.stake + amount > cap) {
      return NextResponse.json({ error: "stake_cap" }, { status: 400, headers: noStore });
    }
    if (amount > wallet.balance) {
      return NextResponse.json({ error: "insufficient_funds" }, { status: 400, headers: noStore });
    }

    const balance = await adjustBalance(wallet.id, -amount, "bet_stake", session.id, {
      game: session.game_id,
      raise: true,
    });
    await supabaseAdmin
      .from("game_sessions")
      .update({ stake: session.stake + amount })
      .eq("id", session.id);

    return NextResponse.json(
      { balance, stake: session.stake + amount },
      { headers: noStore },
    );
  } catch (err) {
    logError(err, { caller: "game_raise" });
    const insufficient = err instanceof Error && err.message === "insufficient_funds";
    return NextResponse.json(
      { error: insufficient ? "insufficient_funds" : "raise_failed" },
      { status: insufficient ? 400 : 500, headers: noStore },
    );
  }
}
