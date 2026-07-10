import { NextResponse } from "next/server";
import { claimWallet, getOrCreateWallet } from "@/lib/nanoBucks";
import { verifyEmailOtp } from "@/lib/walletAuth";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { EMAIL_RE } from "@/lib/marketing";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };
const CODE_RE = /^\d{6}$/;

type Body = { email?: string; code?: string; displayName?: string; subscribe?: boolean };

/**
 * Step 2 of wallet login: confirm the emailed code, attach the email to the
 * wallet, and — unless the visitor opted out — add them to the marketing
 * email list (existing subscriber table).
 */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "wallet_otp_confirm",
    maxAttempts: 15,
    windowMinutes: 15,
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

  const email = String(body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "").trim();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400, headers: noStore });
  }
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400, headers: noStore });
  }
  const displayName = body.displayName ? String(body.displayName).trim().slice(0, 60) : undefined;
  const subscribe = body.subscribe !== false;

  try {
    const wallet = await getOrCreateWallet();
    const result = await verifyEmailOtp(wallet.id, email, code);
    if (result !== "ok") {
      return NextResponse.json({ error: result }, { status: 400, headers: noStore });
    }

    const claimed = await claimWallet(email, displayName);

    if (subscribe) {
      const { error: subError } = await supabaseAdmin
        .from("email_subscribers")
        .upsert(
          { email, status: "subscribed", source: "wallet_login", unsubscribed_at: null },
          { onConflict: "email" },
        );
      if (subError) logError(subError, { caller: "wallet_verify_confirm:subscribe" });
    }

    return NextResponse.json(
      {
        walletCode: claimed.wallet_code,
        displayName: claimed.display_name,
        email: claimed.email,
        balance: claimed.balance,
        lifetimeEarned: claimed.lifetime_earned,
        subscribed: subscribe,
      },
      { headers: noStore },
    );
  } catch (err) {
    logError(err, { caller: "wallet_verify_confirm" });
    return NextResponse.json({ error: "confirm_failed" }, { status: 500, headers: noStore });
  }
}
