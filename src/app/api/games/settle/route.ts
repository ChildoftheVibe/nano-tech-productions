import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import {
  ARCADE_DAILY_CAP,
  ARCADE_PLAY_REWARD,
  ARCADE_WIN_REWARD,
  adjustBalance,
  arcadeRewardsToday,
  gameById,
  getWallet,
} from "@/lib/nanoBucks";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

/** Sessions older than this can no longer be settled. */
const SESSION_TTL_MS = 30 * 60 * 1000;

type Body = {
  sessionId?: string;
  /** Arcade: whether the player won. Casino: ignored. */
  won?: boolean;
  /** Casino: payout in NB (stake already debited). Validated against the
   *  game's max multiplier server-side. */
  payout?: number;
  /** Optional game-specific result detail, stored for audits. */
  detail?: Record<string, unknown>;
};

/**
 * Settle a game round exactly once. The settle is guarded by a conditional
 * UPDATE (status open → settled) so replays and double-settles are no-ops.
 */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "game_settle",
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
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400, headers: noStore });
  }

  try {
    // Claim the session atomically: only one settle can flip open → settled.
    const { data: session, error } = await supabaseAdmin
      .from("game_sessions")
      .update({ status: "settled", settled_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("wallet_id", wallet.id)
      .eq("status", "open")
      .select("id, game_id, mode, stake, created_at, server_seed")
      .maybeSingle();
    if (error) throw error;
    if (!session) {
      return NextResponse.json({ error: "session_not_open" }, { status: 409, headers: noStore });
    }

    const game = gameById(session.game_id);
    const expired =
      Date.now() - new Date(session.created_at).getTime() > SESSION_TTL_MS;
    if (!game || expired) {
      await supabaseAdmin
        .from("game_sessions")
        .update({ status: "expired", payout: 0 })
        .eq("id", session.id);
      return NextResponse.json({ error: "session_expired" }, { status: 410, headers: noStore });
    }

    let payout = 0;
    let capped = false;

    if (session.mode === "arcade") {
      const earnedToday = await arcadeRewardsToday(wallet.id);
      if (earnedToday < ARCADE_DAILY_CAP) {
        payout = body.won ? ARCADE_WIN_REWARD : ARCADE_PLAY_REWARD;
      } else {
        capped = true;
      }
    } else {
      payout = Math.round(Number(body.payout ?? 0));
      const maxPayout = session.stake * (game.maxMultiplier ?? 2);
      if (!Number.isFinite(payout) || payout < 0) payout = 0;
      if (payout > maxPayout) {
        // Client claimed more than the game can mathematically pay — cap it
        // and keep the claim in the session metadata for review.
        payout = maxPayout;
        capped = true;
      }
    }

    let balance = wallet.balance;
    if (payout > 0) {
      balance = await adjustBalance(
        wallet.id,
        payout,
        session.mode === "arcade" ? "earn_game" : "bet_payout",
        session.id,
        { game: session.game_id, won: !!body.won },
      );
    }

    await supabaseAdmin
      .from("game_sessions")
      .update({
        payout,
        metadata: {
          won: !!body.won,
          claimedPayout: body.payout ?? null,
          capped,
          detail: body.detail ?? null,
        },
      })
      .eq("id", session.id);

    return NextResponse.json(
      { payout, balance, capped, serverSeed: session.server_seed },
      { headers: noStore },
    );
  } catch (err) {
    logError(err, { caller: "game_settle" });
    return NextResponse.json({ error: "settle_failed" }, { status: 500, headers: noStore });
  }
}
