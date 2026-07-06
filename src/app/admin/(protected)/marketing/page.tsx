import { supabaseAdmin } from "@/lib/db/admin";
import { MarketingManager, type CampaignEntry, type SubscriberEntry } from "./MarketingManager";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  const [{ data: subscriberRows, count }, { data: campaignRows }] = await Promise.all([
    supabaseAdmin
      .from("email_subscribers")
      .select("id, email, status, source, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("email_campaigns")
      .select(
        "id, subject, preheader, body_html, status, recipient_count, sent_count, failed_count, created_at, sent_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const subscribers: SubscriberEntry[] = (subscriberRows ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    status: r.status === "unsubscribed" ? "unsubscribed" : "subscribed",
    source: r.source ?? "site",
    createdAt: r.created_at,
  }));

  const campaigns: CampaignEntry[] = (campaignRows ?? []).map((r) => ({
    id: r.id,
    subject: r.subject,
    preheader: r.preheader,
    bodyHtml: r.body_html,
    status: r.status,
    recipientCount: r.recipient_count ?? 0,
    sentCount: r.sent_count ?? 0,
    failedCount: r.failed_count ?? 0,
    createdAt: r.created_at,
    sentAt: r.sent_at,
  }));

  return (
    <MarketingManager
      initialSubscribers={subscribers}
      subscriberTotal={count ?? subscribers.length}
      initialCampaigns={campaigns}
    />
  );
}
