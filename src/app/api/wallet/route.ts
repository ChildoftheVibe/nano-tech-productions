import { NextResponse } from "next/server";
import { getOrCreateWallet, claimWallet } from "@/lib/nanoBucks";
import { isAdmin } from "@/lib/auth";
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
    let wallet = await getOrCreateWallet();

    // Admin sessions skip the OTP flow entirely: their wallet is auto-claimed
    // with ADMIN_EMAIL so the games hub treats them as logged in.
    if (!wallet.email && (await isAdmin())) {
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      if (adminEmail) {
        wallet = await claimWallet(adminEmail, "Admin");
      }
    }

    return NextResponse.json(
      {
        walletCode: wallet.wallet_code,
        displayName: wallet.display_name,
        email: wallet.email,
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
