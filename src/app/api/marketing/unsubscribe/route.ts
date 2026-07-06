import { supabaseAdmin } from "@/lib/db/admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function page(title: string, message: string): Response {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#090f0e;color:#dde4e2;font-family:Helvetica,Arial,sans-serif;text-align:center;">
<div style="max-width:420px;padding:32px;">
<p style="font-size:20px;font-weight:700;letter-spacing:4px;color:#62f3e4;">NTV VAULT</p>
<h1 style="font-size:18px;">${title}</h1>
<p style="font-size:14px;line-height:1.6;color:#bbcac6;">${message}</p>
<a href="/" style="color:#62f3e4;font-size:14px;">Back to the Vault</a>
</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

export async function GET(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const allowed = await checkRateLimit({
    identifier: ip,
    action: "marketing_unsubscribe",
    maxAttempts: 20,
    windowMinutes: 10,
  });
  if (!allowed) return page("Slow down", "Too many attempts. Please try again shortly.");

  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!UUID_RE.test(token)) {
    return page("Invalid link", "This unsubscribe link is not valid.");
  }

  const { data, error } = await supabaseAdmin
    .from("email_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  if (error) {
    logError(error, { caller: "marketing/unsubscribe" });
    return page("Something went wrong", "Please try the link again in a moment.");
  }
  if (!data) {
    return page("Invalid link", "This unsubscribe link is not valid or was already used.");
  }

  return page(
    "You are unsubscribed",
    "You will no longer receive marketing emails from NTV Vault. Transactional emails for purchases are unaffected.",
  );
}
