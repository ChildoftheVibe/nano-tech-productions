/**
 * @jest-environment node
 */

jest.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: jest.fn() },
}));

import { validateDiscount } from "@/lib/discounts";
import { supabaseAdmin } from "@/lib/supabase";

const mockFrom = supabaseAdmin.from as jest.Mock;

/** Wire up the discount_codes query to return `row` (or null). */
function mockDiscountRow(row: Record<string, unknown> | null, dbError = false) {
  const maybeSingle = jest
    .fn()
    .mockResolvedValue(
      dbError ? { data: null, error: new Error("db error") } : { data: row, error: null },
    );
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnValue({ maybeSingle }),
    }),
  });
}

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 1_000).toISOString();

const validRow = {
  id: "cid-1",
  code: "SAVE10",
  discount_percent: 10,
  applies_to: "all",
  album_id: null,
  expires_at: future,
  max_uses: null,
  current_uses: 0,
  is_active: true,
};

describe("validateDiscount", () => {
  beforeEach(() => mockFrom.mockReset());

  it("returns valid=true with correct discount for an active code", async () => {
    mockDiscountRow(validRow);
    const result = await validateDiscount("SAVE10", 9.99, []);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountPercent).toBe(10);
      expect(result.discountAmount).toBe(1.0); // round2(9.99 * 10 / 100)
      expect(result.message).toBe("10% off applied");
    }
  });

  it("returns valid=false with 'Enter a code.' for an empty string", async () => {
    const result = await validateDiscount("", 9.99, []);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Enter a code.");
    // Supabase should not have been called
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns valid=false for an unknown code", async () => {
    mockDiscountRow(null); // no matching row
    const result = await validateDiscount("FAKECODE", 9.99, []);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Invalid code.");
  });

  it("returns valid=false for an expired code", async () => {
    mockDiscountRow({ ...validRow, expires_at: past });
    const result = await validateDiscount("SAVE10", 9.99, []);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Code has expired.");
  });

  it("returns valid=false when usage limit is reached", async () => {
    mockDiscountRow({ ...validRow, max_uses: 10, current_uses: 10 });
    const result = await validateDiscount("SAVE10", 9.99, []);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Code usage limit reached.");
  });

  it("returns valid=false for an inactive code", async () => {
    mockDiscountRow({ ...validRow, is_active: false });
    const result = await validateDiscount("SAVE10", 9.99, []);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Code is inactive.");
  });

  it("returns valid=false when DB errors", async () => {
    mockDiscountRow(null, true);
    const result = await validateDiscount("SAVE10", 9.99, []);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Could not validate code.");
  });

  it("returns valid=false when album-scoped code doesn't match cart items", async () => {
    mockDiscountRow({
      ...validRow,
      applies_to: "album",
      album_id: "album-abc",
    });
    // Cart contains a different album
    const result = await validateDiscount("SAVE10", 9.99, [
      { id: "track-1", kind: "album", albumId: "album-xyz" },
    ]);
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Code does not apply to this purchase.");
  });
});
