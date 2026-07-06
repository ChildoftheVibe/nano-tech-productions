import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAMPAIGN_COLUMNS =
  "id, subject, preheader, body_html, status, recipient_count, sent_count, failed_count, created_at, sent_at";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("email_campaigns")
    .select(CAMPAIGN_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    logError(error, { caller: "admin/marketing/campaigns GET" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json({ campaigns: data ?? [] });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers)))
    return Response.json({ error: "csrf_invalid" }, { status: 403 });

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";
  const preheader =
    typeof body.preheader === "string" ? body.preheader.trim().slice(0, 200) : null;
  const bodyHtml = typeof body.body_html === "string" ? body.body_html : "";

  if (!subject || !bodyHtml)
    return Response.json({ error: "subject and body_html are required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("email_campaigns")
    .insert({ subject, preheader, body_html: bodyHtml })
    .select("id")
    .single();

  if (error) {
    logError(error, { caller: "admin/marketing/campaigns POST" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "marketing_campaign_created",
    entityType: "email_campaigns",
    entityId: data.id,
    performedBy: "admin",
  });
  return Response.json({ id: data.id });
}
