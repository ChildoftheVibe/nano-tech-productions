import { requireAdmin, validateCsrf } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db/admin";
import { logError } from "@/lib/logger";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";
import type { DiscountInput } from "@/lib/db-types";

const DISCOUNT_FIELDS = [
  "code",
  "discount_percent",
  "applies_to",
  "album_id",
  "expires_at",
  "max_uses",
  "is_active",
] as const;

function pickDiscountInput(body: unknown): DiscountInput {
  if (!body || typeof body !== "object") return {};
  const src = body as Record<string, unknown>;
  const out: DiscountInput = {};
  for (const key of DISCOUNT_FIELDS) {
    if (key in src) {
      const val = src[key];
      (out as Record<string, unknown>)[key] = val === "" ? null : val;
    }
  }
  return out;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers))) return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const input = pickDiscountInput(body);

  const { data, error } = await supabaseAdmin
    .from("discount_codes")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logError(error, { caller: "admin/discounts PATCH" });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "admin_discount_updated",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    entityType: "discount_code",
    entityId: id,
    metadata: { fields: Object.keys(input) },
  });

  return Response.json({ discount: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers))) return Response.json({ error: "csrf_invalid" }, { status: 403 });

  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from("discount_codes")
    .select("code")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("discount_codes")
    .delete()
    .eq("id", id);
  if (error) {
    logError(error, { caller: "admin/discounts DELETE" });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "admin_discount_deleted",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    entityType: "discount_code",
    entityId: id,
    metadata: existing ? { code: existing.code } : undefined,
  });

  return Response.json({ ok: true });
}
