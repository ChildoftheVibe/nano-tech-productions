import "server-only";

import { supabaseAdmin } from "./supabase";

export type DiscountCheckItem = {
  id: string;
  kind: "track" | "album";
  albumId?: string;
};

export type DiscountResult =
  | {
      valid: true;
      code: string;
      codeId: string;
      discountPercent: number;
      discountAmount: number;
      message: string;
      appliesTo: "single" | "album" | "all";
      albumId: string | null;
    }
  | {
      valid: false;
      discountPercent: 0;
      discountAmount: 0;
      message: string;
    };

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function validateDiscount(
  rawCode: string,
  cartTotal: number,
  items: DiscountCheckItem[],
): Promise<DiscountResult> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!code) {
    return { valid: false, discountPercent: 0, discountAmount: 0, message: "Enter a code." };
  }

  const { data, error } = await supabaseAdmin
    .from("discount_codes")
    .select(
      "id, code, discount_percent, applies_to, album_id, expires_at, max_uses, current_uses, is_active",
    )
    .ilike("code", code)
    .maybeSingle();

  if (error) {
    return {
      valid: false,
      discountPercent: 0,
      discountAmount: 0,
      message: "Could not validate code.",
    };
  }
  if (!data) {
    return { valid: false, discountPercent: 0, discountAmount: 0, message: "Invalid code." };
  }
  if (!data.is_active) {
    return { valid: false, discountPercent: 0, discountAmount: 0, message: "Code is inactive." };
  }
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return { valid: false, discountPercent: 0, discountAmount: 0, message: "Code has expired." };
  }
  if (data.max_uses != null && data.current_uses >= data.max_uses) {
    return {
      valid: false,
      discountPercent: 0,
      discountAmount: 0,
      message: "Code usage limit reached.",
    };
  }

  if (data.applies_to === "album" && data.album_id) {
    const eligible = items.some(
      (i) => i.kind === "album" && i.albumId === data.album_id,
    );
    if (!eligible) {
      return {
        valid: false,
        discountPercent: 0,
        discountAmount: 0,
        message: "Code does not apply to this purchase.",
      };
    }
  }
  if (data.applies_to === "single") {
    const eligible = items.some((i) => i.kind === "track");
    if (!eligible) {
      return {
        valid: false,
        discountPercent: 0,
        discountAmount: 0,
        message: "Code only applies to single-track purchases.",
      };
    }
  }

  const pct = data.discount_percent;
  const amount = round2((cartTotal * pct) / 100);
  return {
    valid: true,
    code: data.code,
    codeId: data.id,
    discountPercent: pct,
    discountAmount: amount,
    message: `${pct}% off applied`,
    appliesTo: data.applies_to as "single" | "album" | "all",
    albumId: data.album_id,
  };
}

export async function incrementDiscountUsage(codeId: string): Promise<void> {
  await supabaseAdmin.rpc("increment_discount_usage", { code_id: codeId });
}
