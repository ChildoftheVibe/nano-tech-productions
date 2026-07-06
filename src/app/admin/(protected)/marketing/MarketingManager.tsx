"use client";

import { useState } from "react";
import { Mail, Send, Trash2, UserPlus, RefreshCw, FlaskConical, Plus } from "lucide-react";
import { adminFetch } from "@/lib/adminFetch";

export type SubscriberEntry = {
  id: string;
  email: string;
  status: "subscribed" | "unsubscribed";
  source: string;
  createdAt: string;
};

export type CampaignEntry = {
  id: string;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt: string | null;
};

type Props = {
  initialSubscribers: SubscriberEntry[];
  subscriberTotal: number;
  initialCampaigns: CampaignEntry[];
};

type Draft = { id: string | null; subject: string; preheader: string; bodyHtml: string };

const EMPTY_DRAFT: Draft = { id: null, subject: "", preheader: "", bodyHtml: "" };

export function MarketingManager({
  initialSubscribers,
  subscriberTotal,
  initialCampaigns,
}: Props) {
  const [tab, setTab] = useState<"campaigns" | "subscribers">("campaigns");
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [total, setTotal] = useState(subscriberTotal);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function api(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await adminFetch(url, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError((json.error as string) ?? "Request failed");
        return null;
      }
      return json;
    } finally {
      setBusy(false);
    }
  }

  async function refreshCampaigns() {
    const json = await api("/api/admin/marketing/campaigns", "GET");
    if (!json) return;
    const rows = (json.campaigns as Record<string, unknown>[]) ?? [];
    setCampaigns(
      rows.map((r) => ({
        id: String(r.id),
        subject: String(r.subject ?? ""),
        preheader: typeof r.preheader === "string" ? r.preheader : null,
        bodyHtml: String(r.body_html ?? ""),
        status: String(r.status ?? "draft"),
        recipientCount: Number(r.recipient_count ?? 0),
        sentCount: Number(r.sent_count ?? 0),
        failedCount: Number(r.failed_count ?? 0),
        createdAt: String(r.created_at ?? ""),
        sentAt: typeof r.sent_at === "string" ? r.sent_at : null,
      })),
    );
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.subject.trim() || !draft.bodyHtml.trim()) {
      setError("Subject and body are required.");
      return;
    }
    const payload = {
      subject: draft.subject,
      preheader: draft.preheader || null,
      body_html: draft.bodyHtml,
    };
    const res = draft.id
      ? await api(`/api/admin/marketing/campaigns/${draft.id}`, "PATCH", payload)
      : await api("/api/admin/marketing/campaigns", "POST", payload);
    if (!res) return;
    setNotice("Draft saved.");
    setDraft(null);
    await refreshCampaigns();
  }

  async function sendTest(campaign: CampaignEntry) {
    const to = testEmail.trim();
    if (!to) {
      setError("Enter a test email address first.");
      return;
    }
    const res = await api(`/api/admin/marketing/campaigns/${campaign.id}`, "POST", {
      action: "test",
      to,
    });
    if (res) setNotice(`Test sent to ${to}.`);
  }

  async function sendCampaign(campaign: CampaignEntry) {
    if (
      !confirm(
        `Send "${campaign.subject}" to all subscribed contacts? This cannot be undone.`,
      )
    )
      return;
    const res = await api(`/api/admin/marketing/campaigns/${campaign.id}`, "POST", {
      action: "send",
    });
    if (res) {
      setNotice(`Campaign sent: ${res.sent} delivered, ${res.failed} failed.`);
      await refreshCampaigns();
    }
  }

  async function deleteCampaign(campaign: CampaignEntry) {
    if (!confirm(`Delete draft "${campaign.subject}"?`)) return;
    const res = await api(`/api/admin/marketing/campaigns/${campaign.id}`, "DELETE");
    if (!res) return;
    setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
  }

  async function addSubscriber() {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    const res = await api("/api/admin/marketing/subscribers", "POST", { email });
    if (!res) return;
    setNewEmail("");
    setNotice(`${email} subscribed.`);
    setSubscribers((prev) => [
      {
        id: crypto.randomUUID(),
        email,
        status: "subscribed",
        source: "admin",
        createdAt: new Date().toISOString(),
      },
      ...prev.filter((s) => s.email !== email),
    ]);
    setTotal((t) => t + 1);
  }

  async function syncOrders() {
    const res = await api("/api/admin/marketing/subscribers", "POST", {
      action: "sync_orders",
    });
    if (res) setNotice(`Imported buyers from orders (${res.imported} candidates).`);
  }

  async function deleteSubscriber(sub: SubscriberEntry) {
    if (!confirm(`Remove ${sub.email} from the list entirely?`)) return;
    const res = await api(`/api/admin/marketing/subscribers?id=${sub.id}`, "DELETE");
    if (!res) return;
    setSubscribers((prev) => prev.filter((s) => s.id !== sub.id));
    setTotal((t) => Math.max(0, t - 1));
  }

  const inputClass =
    "w-full rounded border border-white/15 bg-[#121212]/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#62f3e4] focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail size={18} className="text-[#62f3e4]" />
        <h1 className="text-lg font-semibold text-white">Email Marketing</h1>
      </div>

      <div className="flex gap-2">
        {(["campaigns", "subscribers"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded border px-4 py-2 text-sm capitalize transition-colors ${
              tab === t
                ? "border-[#62f3e4] bg-[#62f3e4]/10 text-[#62f3e4]"
                : "border-white/15 text-white/60 hover:border-white/30"
            }`}
          >
            {t}
            {t === "subscribers" ? ` (${total})` : ""}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded border border-[#62f3e4]/30 bg-[#62f3e4]/10 px-3 py-2 text-sm text-[#62f3e4]">
          {notice}
        </p>
      )}

      {tab === "campaigns" && (
        <section className="space-y-4">
          {draft ? (
            <div className="space-y-3 rounded border border-white/10 bg-[#181f1e] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">
                {draft.id ? "Edit Draft" : "New Campaign"}
              </h2>
              <input
                className={inputClass}
                placeholder="Subject"
                value={draft.subject}
                maxLength={200}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Preheader (preview text, optional)"
                value={draft.preheader}
                maxLength={200}
                onChange={(e) => setDraft({ ...draft, preheader: e.target.value })}
              />
              <textarea
                className={`${inputClass} min-h-[220px] font-mono text-xs`}
                placeholder="Email body HTML — wrapped automatically in the NTV Vault dark template with an unsubscribe footer."
                value={draft.bodyHtml}
                onChange={(e) => setDraft({ ...draft, bodyHtml: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveDraft()}
                  disabled={busy}
                  className="rounded bg-[#62f3e4] px-4 py-2 text-sm font-semibold text-[#003733] disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded border border-white/15 px-4 py-2 text-sm text-white/60 hover:border-white/30"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDraft(EMPTY_DRAFT)}
              className="flex items-center gap-2 rounded bg-[#62f3e4] px-4 py-2 text-sm font-semibold text-[#003733]"
            >
              <Plus size={14} /> New Campaign
            </button>
          )}

          <div className="flex items-center gap-2">
            <FlaskConical size={14} className="text-white/40" />
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Test recipient email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>

          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded border border-white/10 bg-[#181f1e] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{c.subject}</p>
                  <p className="text-[11px] uppercase tracking-wider text-white/40">
                    {c.status}
                    {c.status === "sent"
                      ? ` · ${c.sentCount}/${c.recipientCount} delivered${
                          c.failedCount ? `, ${c.failedCount} failed` : ""
                        }`
                      : ""}
                    {c.sentAt ? ` · ${new Date(c.sentAt).toLocaleString()}` : ""}
                  </p>
                </div>
                {(c.status === "draft" || c.status === "failed") && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          id: c.id,
                          subject: c.subject,
                          preheader: c.preheader ?? "",
                          bodyHtml: c.bodyHtml,
                        })
                      }
                      className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:border-white/30"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendTest(c)}
                      disabled={busy}
                      className="flex items-center gap-1 rounded border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:border-white/30 disabled:opacity-50"
                    >
                      <FlaskConical size={12} /> Test
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendCampaign(c)}
                      disabled={busy}
                      className="flex items-center gap-1 rounded bg-[#62f3e4] px-3 py-1.5 text-xs font-semibold text-[#003733] disabled:opacity-50"
                    >
                      <Send size={12} /> Send
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCampaign(c)}
                      disabled={busy}
                      className="rounded-full p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      title="Delete draft"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
            {campaigns.length === 0 && (
              <li className="rounded border border-white/5 px-4 py-6 text-center text-sm text-white/40">
                No campaigns yet. Create one to reach your subscribers.
              </li>
            )}
          </ul>
        </section>
      )}

      {tab === "subscribers" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Add email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addSubscriber();
              }}
            />
            <button
              type="button"
              onClick={() => void addSubscriber()}
              disabled={busy || !newEmail.trim()}
              className="flex items-center gap-1 rounded bg-[#62f3e4] px-3 py-2 text-xs font-semibold text-[#003733] disabled:opacity-50"
            >
              <UserPlus size={13} /> Add
            </button>
            <button
              type="button"
              onClick={() => void syncOrders()}
              disabled={busy}
              className="flex items-center gap-1 rounded border border-white/15 px-3 py-2 text-xs text-white/60 hover:border-white/30 disabled:opacity-50"
              title="Import unique buyer emails from completed orders"
            >
              <RefreshCw size={13} /> Import buyers
            </button>
          </div>

          <ul className="space-y-1.5">
            {subscribers.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded border border-white/10 bg-[#181f1e] px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{s.email}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">
                    {s.status} · {s.source} · {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    s.status === "subscribed"
                      ? "bg-[#62f3e4]/15 text-[#62f3e4]"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {s.status}
                </span>
                <button
                  type="button"
                  onClick={() => void deleteSubscriber(s)}
                  disabled={busy}
                  className="rounded-full p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  title="Delete subscriber"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {subscribers.length === 0 && (
              <li className="rounded border border-white/5 px-4 py-6 text-center text-sm text-white/40">
                No subscribers yet. Use “Import buyers” to seed the list from past
                orders, or add addresses manually.
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
