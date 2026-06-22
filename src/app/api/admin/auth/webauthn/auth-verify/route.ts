import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { createSession, setAdminCookie } from "@/lib/auth";
import { clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";
import { checkRateLimitStrict } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRpConfig() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL(siteUrl);
  return { rpID: url.hostname, origin: url.origin };
}

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimitStrict({
    identifier: ip,
    action: "webauthn_auth",
    maxAttempts: 5,
    windowMinutes: 15,
  });
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const jar = await cookies();
  const challenge = jar.get("webauthn_auth_challenge")?.value;
  if (!challenge) {
    return NextResponse.json({ error: "no_challenge" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const credentialId = typeof body.id === "string" ? body.id : null;
  if (!credentialId) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const { data: stored } = await supabaseAdmin
    .from("admin_webauthn_credentials")
    .select("*")
    .eq("credential_id", credentialId)
    .maybeSingle();

  if (!stored) {
    return NextResponse.json({ error: "unknown_credential" }, { status: 401 });
  }

  const { rpID, origin } = getRpConfig();

  let verified = false;
  let authenticationInfo;
  try {
    const result = await verifyAuthenticationResponse({
      response: body as unknown as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credential_id,
        publicKey: Uint8Array.from(Buffer.from(stored.public_key, "base64url")),
        counter: Number(stored.counter),
        transports: (stored.transports as AuthenticatorTransport[] | null) ?? undefined,
      },
      requireUserVerification: true,
    });
    verified = result.verified;
    authenticationInfo = result.authenticationInfo;
  } catch (err) {
    logError(err, { caller: "webauthn/auth-verify" });
    return NextResponse.json({ error: "verification_failed" }, { status: 401 });
  }

  if (!verified) {
    return NextResponse.json({ error: "not_verified" }, { status: 401 });
  }

  // Update counter to prevent replay attacks.
  await supabaseAdmin
    .from("admin_webauthn_credentials")
    .update({ counter: authenticationInfo?.newCounter ?? stored.counter })
    .eq("credential_id", credentialId);

  const token = await createSession(ip);
  await setAdminCookie(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("webauthn_auth_challenge");
  return res;
}
