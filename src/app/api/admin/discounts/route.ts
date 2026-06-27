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

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseAdmin
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logError(error, { caller: "admin/discounts GET" });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  return Response.json({ discounts: data });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!(await validateCsrf(request.headers))) return Response.json({ error: "csrf_invalid" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const input = pickDiscountInput(body);
  if (!input.code || !input.discount_percent || !input.applies_to || !input.expires_at) {
    return Response.json(
      { error: "code, discount_percent, applies_to, expires_at are required" },
      { status: 400 },
    );
  }

  // Validate discount_percent is in the valid range (M2 fix)
  const pct = Number(input.discount_percent);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
    return Response.json({ error: "discount_percent must be 1–100" }, { status: 400 });
  }

  if (input.expires_at && new Date(input.expires_at as string) <= new Date()) {
    return Response.json({ error: "expires_at must be in the future" }, { status: 400 });
  }

  if (input.max_uses !== undefined && input.max_uses !== null) {
    const mu = Number(input.max_uses);
    if (!Number.isInteger(mu) || mu < 1) {
      return Response.json({ error: "max_uses must be a positive integer" }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("discount_codes")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    logError(error, { caller: "admin/discounts POST" });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }

  await logAuditEvent({
    eventType: "admin_discount_created",
    performedBy: "admin",
    ipAddress: clientIpFromHeaders(request.headers),
    metadata: { code: input.code, discount_percent: pct, applies_to: input.applies_to },
  });

  return Response.json({ discount: data }, { status: 201 });
}
