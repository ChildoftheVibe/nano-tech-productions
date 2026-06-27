import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRpConfig() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL(siteUrl);
  return { rpID: url.hostname, rpName: "NTV Admin", origin: url.origin };
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { rpID, rpName } = getRpConfig();

  // Fetch existing credentials so we can exclude them from re-registration.
  const { data: existing } = await supabaseAdmin
    .from("admin_webauthn_credentials")
    .select("credential_id, transports");

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode("ntv-admin"),
    userName: "admin",
    userDisplayName: "NTV Admin",
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "required",
    },
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports as AuthenticatorTransport[] | null) ?? undefined,
    })),
  });

  const res = NextResponse.json(options);
  res.cookies.set("webauthn_reg_challenge", options.challenge, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });
  return res;
}
