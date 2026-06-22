import { supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeoBody = {
  session_id?: unknown;
  device_type?: unknown;
  ua?: unknown;
};

function parseUA(ua: string | null): { os: string | null; browser: string | null } {
  if (!ua) return { os: null, browser: null };
  let os: string | null = null;
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/iPhone|iPad|iOS/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";

  let browser: string | null = null;
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";

  return { os, browser };
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimit({
    identifier: ip,
    action: "analytics_geo",
    maxAttempts: 10,
    windowMinutes: 5,
  });
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  let body: GeoBody = {};
  try {
    body = (await req.json()) as GeoBody;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!sessionId) {
    return Response.json({ error: "session_id required" }, { status: 400 });
  }

  const headers = req.headers;
  const country = decodeHeader(headers.get("x-vercel-ip-country"));
  const region = decodeHeader(headers.get("x-vercel-ip-country-region"));
  const city = decodeHeader(headers.get("x-vercel-ip-city"));
  const ua = typeof body.ua === "string" ? body.ua : (headers.get("user-agent") ?? null);
  const { os, browser } = parseUA(ua);
  const deviceType =
    typeof body.device_type === "string" ? body.device_type : null;

  // Upsert by session_id; bump last_seen and page_views.
  const { data: existing } = await supabaseAdmin
    .from("analytics_sessions")
    .select("id, page_views")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("analytics_sessions")
      .update({
        last_seen: new Date().toISOString(),
        page_views: (existing.page_views ?? 0) + 1,
      })
      .eq("id", existing.id);
    if (error) return Response.json({ error: "internal_error" }, { status: 500 });
    return Response.json({ ok: true, returning: true });
  }

  const { error } = await supabaseAdmin.from("analytics_sessions").insert({
    session_id: sessionId,
    country,
    region,
    city,
    device_type: deviceType,
    os,
    browser,
    page_views: 1,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, returning: false });
}
