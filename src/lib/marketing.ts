import "server-only";

import { Resend } from "resend";
import { supabaseAdmin } from "./db/admin";
import { logError, logInfo } from "@/lib/logger";

let cached: Resend | null = null;

export function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_YOUR_KEY_HERE") return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

export function marketingFromAddress(): string {
  return (
    process.env.RESEND_MARKETING_FROM_EMAIL ??
    process.env.RESEND_FROM_EMAIL ??
    "vault@nanotechvibe.com"
  );
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.nanotechvibe.com").replace(
    /\/$/,
    "",
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Dark, NTV-branded shell around campaign body HTML. Includes the legally
 *  required unsubscribe link (CAN-SPAM) built from the subscriber's token. */
export function wrapCampaignHtml(opts: {
  subject: string;
  preheader?: string | null;
  bodyHtml: string;
  unsubscribeToken: string;
}): string {
  const unsubUrl = `${siteUrl()}/api/marketing/unsubscribe?token=${opts.unsubscribeToken}`;
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#090f0e;color:#dde4e2;font-family:Helvetica,Arial,sans-serif;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#090f0e;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="padding-bottom:24px;text-align:center;">
        <span style="font-size:22px;font-weight:700;letter-spacing:4px;color:#62f3e4;">NTV&nbsp;VAULT</span>
      </td></tr>
      <tr><td style="background-color:#1a2120;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px;">
        ${opts.bodyHtml}
      </td></tr>
      <tr><td style="padding-top:24px;text-align:center;font-size:11px;line-height:1.7;color:#8a9995;">
        © ${new Date().getFullYear()} Nano Tech Productions · <a href="${siteUrl()}" style="color:#62f3e4;text-decoration:none;">nanotechvibe.com</a><br/>
        You are receiving this because you subscribed to NTV Vault updates.<br/>
        <a href="${unsubUrl}" style="color:#8a9995;text-decoration:underline;">Unsubscribe</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export type Subscriber = { email: string; unsubscribe_token: string };

export type CampaignSendResult = {
  sent: number;
  failed: number;
  total: number;
};

/** Send a campaign to every subscribed address in Resend batches of 100.
 *  Per-recipient HTML (unsubscribe token) means one message per recipient. */
export async function sendCampaignToSubscribers(opts: {
  subject: string;
  preheader?: string | null;
  bodyHtml: string;
  subscribers: Subscriber[];
}): Promise<CampaignSendResult> {
  const resend = resendClient();
  if (!resend) throw new Error("email_unconfigured");

  const from = marketingFromAddress();
  let sent = 0;
  let failed = 0;

  const BATCH = 100;
  for (let i = 0; i < opts.subscribers.length; i += BATCH) {
    const slice = opts.subscribers.slice(i, i + BATCH);
    try {
      const { data, error } = await resend.batch.send(
        slice.map((s) => ({
          from,
          to: s.email,
          subject: opts.subject,
          html: wrapCampaignHtml({
            subject: opts.subject,
            preheader: opts.preheader,
            bodyHtml: opts.bodyHtml,
            unsubscribeToken: s.unsubscribe_token,
          }),
        })),
      );
      if (error) {
        logError(error, { caller: "marketing:sendCampaign batch" });
        failed += slice.length;
      } else {
        sent += data?.data?.length ?? slice.length;
      }
    } catch (err) {
      logError(err, { caller: "marketing:sendCampaign batch throw" });
      failed += slice.length;
    }
  }

  logInfo("marketing campaign send finished", { sent, failed });
  return { sent, failed, total: opts.subscribers.length };
}

/** All currently subscribed recipients. */
export async function getSubscribedRecipients(): Promise<Subscriber[]> {
  const { data, error } = await supabaseAdmin
    .from("email_subscribers")
    .select("email, unsubscribe_token")
    .eq("status", "subscribed");
  if (error) {
    logError(error, { caller: "marketing:getSubscribedRecipients" });
    throw new Error("subscriber_query_failed");
  }
  return (data ?? []) as Subscriber[];
}
