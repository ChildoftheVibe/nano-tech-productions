#!/usr/bin/env node
/**
 * One-off: sends the "Signal Grid" digital-marketing automation checklist to
 * the label inbox via Resend.
 *
 *   RESEND_API_KEY=re_xxx node scripts/send-marketing-checklist.mjs
 *
 * The same content is pre-seeded as a draft campaign in /admin/marketing, so
 * this script is optional — the admin Send button does the same job.
 */

const TO = "nanotekproductions@gmail.com";
const FROM = process.env.RESEND_FROM_EMAIL ?? "vault@nanotechvibe.com";
const SUBJECT = "The Signal Grid — Keys to Automating the Vault's Reach";

export const BODY_HTML = `
<p style="margin:0 0 4px;font-size:11px;letter-spacing:5px;text-transform:uppercase;color:#ffabef;">Transmission 001 · For the Architect</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#62f3e4;">THE SIGNAL GRID</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:1.8;color:#bbcac6;">
Somewhere between the bassline and the stars, a machine hums — one that carries the
Vault's frequencies to every timeline without you lifting a finger. These are the
conduits it needs. Gather the keys. Wire the grid. Let the signal travel.
</p>

<h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#ffabef;">I · The Voice — Owned Channels</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.7;color:#dde4e2;">
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ Resend</span> — the courier of the Vault. Powers the new in-house email marketing engine (campaigns, order emails, this very transmission).<br/>
<span style="color:#8a9995;font-size:12px;">Key needed: RESEND_API_KEY + verified nanotechvibe.com domain → Vercel env.</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ PostHog</span> — already watching the chamber. Add cohorts + webhooks so listener behavior (3 plays, no purchase) triggers automated email journeys.<br/>
<span style="color:#8a9995;font-size:12px;">Already wired: NEXT_PUBLIC_POSTHOG_KEY. Add: destination webhooks.</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ Web Push (VAPID)</span> — the PWA is installed on believers' home screens; push keys let drops announce themselves.<br/>
<span style="color:#8a9995;font-size:12px;">Key needed: VAPID key pair (free, self-generated).</span>
</td></tr>
</table>

<h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#ffabef;">II · The Echo — Social Broadcast</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.7;color:#dde4e2;">
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ Meta Graph API</span> — auto-post drops, portal clips, and canvas art to Instagram + Facebook.<br/>
<span style="color:#8a9995;font-size:12px;">Keys: Meta developer app, IG Business account, long-lived page token.</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ TikTok Content Posting API</span> — vertical portal-intro videos are already 9:16; pipe them straight to the feed.<br/>
<span style="color:#8a9995;font-size:12px;">Keys: TikTok developer app + content.publish scope.</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ YouTube Data API v3</span> — schedule visualizer uploads + Shorts from album media.<br/>
<span style="color:#8a9995;font-size:12px;">Keys: Google Cloud project, OAuth client, youtube.upload scope.</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ X API (v2)</span> — drop announcements + link cards on release day.<br/>
<span style="color:#8a9995;font-size:12px;">Keys: X developer account, write-scope tokens.</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ Buffer or Late (scheduler)</span> — one API to schedule across all networks if you'd rather not hold four platform keys.<br/>
<span style="color:#8a9995;font-size:12px;">Key: single API token; trades control for simplicity.</span>
</td></tr>
</table>

<h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#ffabef;">III · The Constellations — Streaming & Discovery</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.7;color:#dde4e2;">
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ Spotify Web API</span> — sync release metadata, follower counts, and auto-build pre-save campaigns.<br/>
<span style="color:#8a9995;font-size:12px;">Keys: Spotify developer app (client id + secret).</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ Google Search Console + GA4</span> — watch which portals the outside world finds; feed keywords back into drop copy.<br/>
<span style="color:#8a9995;font-size:12px;">Keys: Google Cloud service account, Search Console property verification.</span>
</td></tr>
</table>

<h2 style="margin:24px 0 8px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#ffabef;">IV · The Loom — Automation Glue</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.7;color:#dde4e2;">
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ Zapier or Make</span> — the threads between everything: new album published → post everywhere, email the list, ping Discord.<br/>
<span style="color:#8a9995;font-size:12px;">Key: account + webhook URLs; NTV Vault can call them from Supabase triggers or Vercel cron.</span>
</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
<span style="color:#62f3e4;">◆ Discord Webhook</span> — a free, instant inner-circle channel for the most devoted travelers.<br/>
<span style="color:#8a9995;font-size:12px;">Key: webhook URL only. Zero cost.</span>
</td></tr>
<tr><td style="padding:10px 0;">
<span style="color:#62f3e4;">◆ Cloudinary (already held)</span> — auto-derive social crops (1:1, 9:16, 16:9) from every album cover so each platform gets native-fit art with no manual exports.<br/>
<span style="color:#8a9995;font-size:12px;">Already wired: named transformations are all that's missing.</span>
</td></tr>
</table>

<p style="margin:28px 0 0;padding:16px;border:1px solid rgba(98,243,228,0.3);border-radius:8px;font-size:13px;line-height:1.8;color:#bbcac6;background:rgba(98,243,228,0.05);">
<span style="color:#62f3e4;font-weight:700;">First moves:</span> (1) verify nanotechvibe.com in Resend and set
RESEND_API_KEY in Vercel — the Vault's email engine is already built and waiting;
(2) create the Meta + TikTok developer apps while their review queues run;
(3) wire one Zapier thread: album published → announcement everywhere.
The grid awakens one conduit at a time.
</p>`;

function wrap(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background-color:#090f0e;color:#dde4e2;font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#090f0e;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding-bottom:24px;text-align:center;"><span style="font-size:22px;font-weight:700;letter-spacing:4px;color:#62f3e4;">NTV&nbsp;VAULT</span></td></tr>
<tr><td style="background-color:#1a2120;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px;">${bodyHtml}</td></tr>
<tr><td style="padding-top:24px;text-align:center;font-size:11px;color:#8a9995;">© ${new Date().getFullYear()} Nano Tech Productions · internal transmission</td></tr>
</table></td></tr></table></body></html>`;
}

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error(
    "RESEND_API_KEY is not set. Set it (or send the pre-seeded draft from /admin/marketing) to deliver the checklist.",
  );
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from: FROM, to: TO, subject: SUBJECT, html: wrap(BODY_HTML) }),
});

if (!res.ok) {
  console.error("Send failed:", res.status, await res.text());
  process.exit(1);
}
console.log("Checklist transmission sent to", TO);
