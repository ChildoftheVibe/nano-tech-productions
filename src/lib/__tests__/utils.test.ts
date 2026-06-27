// Mock Supabase before importing modules that depend on it
jest.mock("@/lib/db/admin", () => ({
  supabaseAdmin: { rpc: jest.fn() },
}));
jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarning: jest.fn(),
  logInfo: jest.fn(),
}));

import { formatPrice } from "../utils";
import { checkRateLimit, checkRateLimitStrict } from "../rateLimit";
import { supabaseAdmin } from "@/lib/db/admin";

const mockRpc = supabaseAdmin.rpc as jest.Mock;

// ---------------------------------------------------------------------------
// Price formatting
// ---------------------------------------------------------------------------
describe("formatPrice", () => {
  it("formats 100 cents as $1.00", () => {
    expect(formatPrice(100)).toBe("$1.00");
  });

  it("formats 999 cents as $9.99", () => {
    expect(formatPrice(999)).toBe("$9.99");
  });

  it("formats 0 cents as $0.00", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });
});

// ---------------------------------------------------------------------------
// Discount calculation — mirrors the round2 formula in discounts.ts
// ---------------------------------------------------------------------------
const round2 = (n: number) => Math.round(n * 100) / 100;
const calcDiscount = (cartTotal: number, pct: number) =>
  round2((cartTotal * pct) / 100);

describe("discount calculation", () => {
  it("10% off $9.99 gives $1.00 discount and $8.99 final", () => {
    const discount = calcDiscount(9.99, 10);
    expect(discount).toBe(1.0);
    expect(round2(9.99 - discount)).toBe(8.99);
  });

  it("20% off $50.00 gives $10.00 discount", () => {
    expect(calcDiscount(50.0, 20)).toBe(10.0);
  });

  it("rounds fractional results to 2 decimal places", () => {
    // 33% of $9.99 = 3.2967 → rounds to 3.30
    expect(calcDiscount(9.99, 33)).toBe(3.3);
  });

  it("0% discount gives $0.00", () => {
    expect(calcDiscount(9.99, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Download token expiry — mirrors the check in api/download/[token]/route.ts
// ---------------------------------------------------------------------------
const isExpired = (expiresAt: string) =>
  new Date(expiresAt).getTime() <= Date.now();

describe("download token expiry", () => {
  it("past timestamp is expired", () => {
    expect(isExpired(new Date(Date.now() - 1_000).toISOString())).toBe(true);
  });

  it("future timestamp is not expired", () => {
    expect(isExpired(new Date(Date.now() + 3_600_000).toISOString())).toBe(
      false,
    );
  });

  it("timestamp 1 ms in the past is expired", () => {
    expect(isExpired(new Date(Date.now() - 1).toISOString())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rate limit helpers
// ---------------------------------------------------------------------------
const opts = {
  identifier: "127.0.0.1",
  action: "test",
  maxAttempts: 5,
  windowMinutes: 1,
};

describe("checkRateLimit (fail-open)", () => {
  beforeEach(() => mockRpc.mockReset());

  it("returns true when DB allows the request", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    expect(await checkRateLimit(opts)).toBe(true);
  });

  it("returns false when DB denies the request", async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });
    expect(await checkRateLimit(opts)).toBe(false);
  });

  it("returns true (fail-open) when DB returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("db error") });
    expect(await checkRateLimit(opts)).toBe(true);
  });

  it("returns true (fail-open) when DB throws", async () => {
    mockRpc.mockRejectedValue(new Error("network error"));
    expect(await checkRateLimit(opts)).toBe(true);
  });
});

describe("checkRateLimitStrict (fail-closed)", () => {
  beforeEach(() => mockRpc.mockReset());

  it("returns true when DB allows the request", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    expect(await checkRateLimitStrict(opts)).toBe(true);
  });

  it("returns false (fail-closed) when DB returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("db error") });
    expect(await checkRateLimitStrict(opts)).toBe(false);
  });

  it("returns false (fail-closed) when DB throws", async () => {
    mockRpc.mockRejectedValue(new Error("network error"));
    expect(await checkRateLimitStrict(opts)).toBe(false);
  });
});
