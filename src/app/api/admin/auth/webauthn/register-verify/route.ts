import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRpConfig() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL(siteUrl);
  return { rpID: url.hostname, origin: url.origin };
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jar = await cookies();
  const challenge = jar.get("webauthn_reg_challenge")?.value;
  if (!challenge) {
    return NextResponse.json({ error: "no_challenge" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { rpID, origin } = getRpConfig();

  let verified = false;
  let registrationInfo;
  try {
    const result = await verifyRegistrationResponse({
      response: body as Parameters<typeof verifyRegistrationResponse>[0]["response"],
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    verified = result.verified;
    registrationInfo = result.registrationInfo;
  } catch (err) {
    logError(err, { caller: "webauthn/register-verify" });
    return NextResponse.json({ error: "verification_failed" }, { status: 400 });
  }

  if (!verified || !registrationInfo) {
    return NextResponse.json({ error: "not_verified" }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;
  const { error: dbErr } = await supabaseAdmin
    .from("admin_webauthn_credentials")
    .upsert(
      {
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        device_type: credentialDeviceType ?? null,
        backed_up: credentialBackedUp ?? false,
        transports: credential.transports ?? null,
      },
      { onConflict: "credential_id" },
    );

  if (dbErr) {
    logError(dbErr, { caller: "webauthn/register-verify save" });
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("webauthn_reg_challenge");
  return res;
}
