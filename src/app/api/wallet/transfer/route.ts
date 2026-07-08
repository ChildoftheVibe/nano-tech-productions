import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { getWallet } from "@/lib/nanoBucks";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

type Body = { toCode?: string; amount?: number; note?: string };

/** Share / trade Nano Bucks with another wallet by its NTV-XXXXXXXX code. */
export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "wallet_transfer",
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

  const amount = Math.round(Number(body.amount));
  const toCode = String(body.toCode ?? "").trim().toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000 || !/^NTV-[A-F0-9]{8}$/.test(toCode)) {
    return NextResponse.json({ error: "invalid_transfer" }, { status: 400, headers: noStore });
  }
  if (amount > wallet.balance) {
    return NextResponse.json({ error: "insufficient_funds" }, { status: 400, headers: noStore });
  }

  const { data: target } = await supabaseAdmin
    .from("wallets")
    .select("id")
    .eq("wallet_code", toCode)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "recipient_not_found" }, { status: 404, headers: noStore });
  }

  const note = typeof body.note === "string" ? body.note.slice(0, 200) : null;
  const { error } = await supabaseAdmin.rpc("wallet_transfer", {
    p_from: wallet.id,
    p_to: target.id,
    p_amount: amount,
    p_note: note,
  });
  if (error) {
    logError(error, { caller: "wallet_transfer" });
    const insufficient = error.code === "23514";
    return NextResponse.json(
      { error: insufficient ? "insufficient_funds" : "transfer_failed" },
      { status: insufficient ? 400 : 500, headers: noStore },
    );
  }

  return NextResponse.json({ ok: true, sent: amount }, { headers: noStore });
}
