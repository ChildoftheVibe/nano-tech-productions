import { NextResponse } from "next/server";
import { getOrCreateWallet } from "@/lib/nanoBucks";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

/** Get (or lazily create) the visitor's Nano Bucks wallet. */
export async function GET(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimit({
    identifier: ip,
    action: "wallet_get",
    maxAttempts: 120,
    windowMinutes: 5,
  });
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: noStore });
  }

  try {
    const wallet = await getOrCreateWallet();
    return NextResponse.json(
      {
        walletCode: wallet.wallet_code,
        displayName: wallet.display_name,
        balance: wallet.balance,
        lifetimeEarned: wallet.lifetime_earned,
      },
      { headers: noStore },
    );
  } catch (err) {
    logError(err, { caller: "wallet_get" });
    return NextResponse.json({ error: "wallet_error" }, { status: 500, headers: noStore });
  }
}
