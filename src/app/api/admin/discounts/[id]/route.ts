import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
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

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ discount: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("discount_codes")
    .delete()
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
