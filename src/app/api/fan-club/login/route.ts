import { NextRequest, NextResponse } from "next/server";
import { clientIpFromHeaders } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);

  const allowed = await checkRateLimit({
    identifier: ip,
    action: "fan_club_login",
    maxAttempts: 10,
    windowMinutes: 15,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts — try again later." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  // Fan Club auth is not yet implemented.
  return NextResponse.json(
    { error: "coming_soon" },
    { status: 503 },
  );
}
