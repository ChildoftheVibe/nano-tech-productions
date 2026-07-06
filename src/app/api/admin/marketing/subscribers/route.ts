import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { EMAIL_RE } from "@/lib/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 100));
  const start = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from("email_subscribers")
    .select("id, email, status, source, created_at, unsubscribed_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, start + limit - 1);

  if (error) {
    logError(error, { caller: "admin/marketing/subscribers GET" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json({ subscribers: data ?? [], total: count ?? 0, page, limit });
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

  // ── import past buyers from orders ─────────────────────────────────────────
  if (body.action === "sync_orders") {
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("customer_email")
      .eq("status", "completed");
    if (error) {
      logError(error, { caller: "admin/marketing sync_orders query" });
      return Response.json({ error: "internal_error" }, { status: 500 });
    }

    const emails = [
      ...new Set(
        (orders ?? [])
          .map((o) => (typeof o.customer_email === "string" ? o.customer_email.trim().toLowerCase() : ""))
          .filter((e) => EMAIL_RE.test(e)),
      ),
    ];
    if (emails.length === 0) return Response.json({ ok: true, imported: 0 });

    // ignoreDuplicates keeps existing rows (incl. unsubscribed) untouched —
    // an unsubscribe must never be reverted by an import.
    const { error: upsertError } = await supabaseAdmin
      .from("email_subscribers")
      .upsert(
        emails.map((email) => ({ email, source: "order" })),
        { onConflict: "email", ignoreDuplicates: true },
      );
    if (upsertError) {
      logError(upsertError, { caller: "admin/marketing sync_orders upsert" });
      return Response.json({ error: "internal_error" }, { status: 500 });
    }

    await logAuditEvent({
      eventType: "marketing_subscribers_synced",
      entityType: "email_subscribers",
      performedBy: "admin",
      metadata: { candidates: emails.length },
    });
    return Response.json({ ok: true, imported: emails.length });
  }

  // ── manual add ─────────────────────────────────────────────────────────────
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254)
    return Response.json({ error: "invalid_email" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("email_subscribers")
    .upsert({ email, status: "subscribed", source: "admin", unsubscribed_at: null }, { onConflict: "email" });
  if (error) {
    logError(error, { caller: "admin/marketing subscriber add" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "marketing_subscriber_added",
    entityType: "email_subscribers",
    performedBy: "admin",
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers)))
    return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("email_subscribers").delete().eq("id", id);
  if (error) {
    logError(error, { caller: "admin/marketing subscriber delete" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }

  await logAuditEvent({
    eventType: "marketing_subscriber_deleted",
    entityType: "email_subscribers",
    entityId: id,
    performedBy: "admin",
  });
  return Response.json({ ok: true });
}
