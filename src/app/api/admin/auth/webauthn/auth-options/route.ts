import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimitStrict } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRpConfig() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { rpID: new URL(siteUrl).hostname };
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
  const { rpID } = getRpConfig();

  const { data: credentials } = await supabaseAdmin
    .from("admin_webauthn_credentials")
    .select("credential_id, transports");

  if (!credentials?.length) {
    return NextResponse.json({ error: "no_credentials_registered" }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: credentials.map((c) => ({
      id: c.credential_id,
      transports: (c.transports as AuthenticatorTransport[] | null) ?? undefined,
    })),
  });

  const res = NextResponse.json(options);
  res.cookies.set("webauthn_auth_challenge", options.challenge, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
  return res;
}
