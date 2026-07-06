import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { EMAIL_RE } from "@/lib/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "marketing_subscribe",
    maxAttempts: 5,
    windowMinutes: 10,
  });
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      { status: 429, headers: { ...noStore, "Retry-After": "600" } },
    );
  }

  let body: { email?: string; source?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400, headers: noStore });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400, headers: noStore });
  }
  const source =
    typeof body.source === "string" && body.source.length <= 40 ? body.source : "site";

  const { error } = await supabaseAdmin
    .from("email_subscribers")
    .upsert(
      { email, status: "subscribed", source, unsubscribed_at: null },
      { onConflict: "email" },
    );

  if (error) {
    logError(error, { caller: "marketing/subscribe" });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500, headers: noStore });
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
