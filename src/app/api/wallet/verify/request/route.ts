import { NextResponse } from "next/server";
import { getOrCreateWallet } from "@/lib/nanoBucks";
import { createEmailOtp, sendWalletOtpEmail } from "@/lib/walletAuth";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { EMAIL_RE } from "@/lib/marketing";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

type Body = { email?: string };

/** Step 1 of wallet login: email a 6-digit code to verify ownership. */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "wallet_otp_request",
    maxAttempts: 5,
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
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400, headers: noStore });
  }

  // Separate, tighter limit per-email so one IP can't hammer one inbox via
  // rotating source ports/proxies.
  const emailAllowed = await checkRateLimitStrict({
    identifier: `wallet_otp:${email}`,
    action: "wallet_otp_request_email",
    maxAttempts: 5,
    windowMinutes: 15,
  });
  if (!emailAllowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: noStore });
  }

  try {
    const wallet = await getOrCreateWallet();
    const code = await createEmailOtp(wallet.id, email);
    const sent = await sendWalletOtpEmail(email, code);
    if (!sent) {
      return NextResponse.json({ error: "email_unconfigured" }, { status: 503, headers: noStore });
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (err) {
    logError(err, { caller: "wallet_verify_request" });
    return NextResponse.json({ error: "request_failed" }, { status: 500, headers: noStore });
  }
}
