import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import {
  getSubscribedRecipients,
  marketingFromAddress,
  resendClient,
  sendCampaignToSubscribers,
  wrapCampaignHtml,
  EMAIL_RE,
} from "@/lib/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Large lists take a while: 100-recipient batches, one API call each.
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

type CampaignRow = {
  id: string;
  subject: string;
  preheader: string | null;
  body_html: string;
  status: string;
};

async function loadCampaign(id: string): Promise<CampaignRow | null> {
  const { data, error } = await supabaseAdmin
    .from("email_campaigns")
    .select("id, subject, preheader, body_html, status")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logError(error, { caller: "admin/marketing campaign load" });
    return null;
  }
  return data as CampaignRow | null;
}

export async function PATCH(request: Request, { params }: Ctx) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers)))
    return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;
  const campaign = await loadCampaign(id);
  if (!campaign) return Response.json({ error: "not_found" }, { status: 404 });
  if (campaign.status !== "draft" && campaign.status !== "failed")
    return Response.json({ error: "only drafts can be edited" }, { status: 400 });

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.subject === "string") update.subject = body.subject.trim().slice(0, 200);
  if (typeof body.preheader === "string") update.preheader = body.preheader.trim().slice(0, 200);
  if (body.preheader === null) update.preheader = null;
  if (typeof body.body_html === "string") update.body_html = body.body_html;
  if (Object.keys(update).length === 0)
    return Response.json({ error: "nothing to update" }, { status: 400 });

  const { error } = await supabaseAdmin.from("email_campaigns").update(update).eq("id", id);
  if (error) {
    logError(error, { caller: "admin/marketing campaign PATCH" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers)))
    return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("email_campaigns")
    .delete()
    .eq("id", id)
    .in("status", ["draft", "failed"]);
  if (error) {
    logError(error, { caller: "admin/marketing campaign DELETE" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "marketing_campaign_deleted",
    entityType: "email_campaigns",
    entityId: id,
    performedBy: "admin",
  });
  return Response.json({ ok: true });
}

/** POST actions: { action: "test", to } sends a single preview email;
 *  { action: "send" } sends to every subscribed address. */
export async function POST(request: Request, { params }: Ctx) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers)))
    return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;
  const campaign = await loadCampaign(id);
  if (!campaign) return Response.json({ error: "not_found" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  // ── test send ──────────────────────────────────────────────────────────────
  if (body.action === "test") {
    const to = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(to))
      return Response.json({ error: "invalid_email" }, { status: 400 });

    const resend = resendClient();
    if (!resend)
      return Response.json({ error: "email_unconfigured" }, { status: 503 });

    const { error } = await resend.emails.send({
      from: marketingFromAddress(),
      to,
      subject: `[TEST] ${campaign.subject}`,
      html: wrapCampaignHtml({
        subject: campaign.subject,
        preheader: campaign.preheader,
        bodyHtml: campaign.body_html,
        unsubscribeToken: "00000000-0000-0000-0000-000000000000",
      }),
    });
    if (error) {
      logError(error, { caller: "admin/marketing campaign test send" });
      return Response.json({ error: "send_failed" }, { status: 502 });
    }
    return Response.json({ ok: true });
  }

  // ── full send ──────────────────────────────────────────────────────────────
  if (body.action !== "send")
    return Response.json({ error: "unknown action" }, { status: 400 });
  if (campaign.status === "sent" || campaign.status === "sending")
    return Response.json({ error: "campaign already sent" }, { status: 400 });

  let recipients;
  try {
    recipients = await getSubscribedRecipients();
  } catch {
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  if (recipients.length === 0)
    return Response.json({ error: "no subscribed recipients" }, { status: 400 });

  await supabaseAdmin
    .from("email_campaigns")
    .update({ status: "sending", recipient_count: recipients.length })
    .eq("id", id);

  let result;
  try {
    result = await sendCampaignToSubscribers({
      subject: campaign.subject,
      preheader: campaign.preheader,
      bodyHtml: campaign.body_html,
      subscribers: recipients,
    });
  } catch (err) {
    logError(err, { caller: "admin/marketing campaign send" });
    await supabaseAdmin.from("email_campaigns").update({ status: "failed" }).eq("id", id);
    const unconfigured = err instanceof Error && err.message === "email_unconfigured";
    return Response.json(
      { error: unconfigured ? "email_unconfigured" : "send_failed" },
      { status: unconfigured ? 503 : 502 },
    );
  }

  await supabaseAdmin
    .from("email_campaigns")
    .update({
      status: result.failed > 0 && result.sent === 0 ? "failed" : "sent",
      sent_count: result.sent,
      failed_count: result.failed,
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logAuditEvent({
    eventType: "marketing_campaign_sent",
    entityType: "email_campaigns",
    entityId: id,
    performedBy: "admin",
    metadata: { sent: result.sent, failed: result.failed, total: result.total },
  });

  return Response.json({ ok: true, ...result });
}
