import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logError } from "@/lib/logger";
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

  const { data, error } = await supabaseAdmin
    .from("discount_codes")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    logError(error, { caller: "admin/discounts POST" });
    return Response.json({ error: "operation_failed" }, { status: 400 });
  }
  return Response.json({ discount: data }, { status: 201 });
}
