/**
 * @jest-environment node
 */

// Mock next/server before anything imports it
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: 200,
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      }),
    redirect: (url: string, init?: ResponseInit) =>
      new Response(null, {
        status: 302,
        ...init,
        headers: { location: url, ...(init?.headers ?? {}) },
      }),
  },
}));

jest.mock("@/lib/db/admin", () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn() },
}));
jest.mock("@/lib/cloudinary", () => ({
  getPurchaseDownloadUrl: jest.fn(),
}));
jest.mock("@/lib/audit", () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
  clientIpFromHeaders: jest.fn().mockReturnValue("1.2.3.4"),
}));
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimitStrict: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({ logError: jest.fn() }));

import { GET } from "@/app/api/download/[token]/route";
import { supabaseAdmin } from "@/lib/db/admin";
import { getPurchaseDownloadUrl } from "@/lib/cloudinary";
import { checkRateLimitStrict } from "@/lib/rateLimit";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockRpc = supabaseAdmin.rpc as jest.Mock;
const mockGetUrl = getPurchaseDownloadUrl as jest.Mock;
const mockRateLimit = checkRateLimitStrict as jest.Mock;

// A valid 64-char hex token (≥ 32 chars)
const VALID_TOKEN = "a".repeat(64);
const SIGNED_URL = "https://res.cloudinary.com/signed/file.mp3";

const future = new Date(Date.now() + 3_600_000).toISOString();
const past = new Date(Date.now() - 1_000).toISOString();

const tokenRow = {
  id: "tok-1",
  order_id: "ord-1",
  track_id: "trk-1",
  format: "mp3_320",
  expires_at: future,
  used_at: null,
  is_used: false,
};
const orderRow = { id: "ord-1", status: "completed" };
const trackRow: { id: string; public_audio_id: string | null } = { id: "trk-1", public_audio_id: "ntp/audio/track1" };

/** Wire up supabaseAdmin.from to return per-table data. */
function setupDb(
  overrides: Partial<{
    tokenRow: typeof tokenRow | null;
    orderRow: typeof orderRow | null;
    trackRow: typeof trackRow | null;
  }> = {},
) {
  const rows: Record<string, unknown> = {
    download_tokens: overrides.tokenRow !== undefined ? overrides.tokenRow : tokenRow,
    orders: overrides.orderRow !== undefined ? overrides.orderRow : orderRow,
    tracks: overrides.trackRow !== undefined ? overrides.trackRow : trackRow,
  };

  mockFrom.mockImplementation((table: string) => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValue({ data: rows[table] ?? null, error: null });
    return {
      select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle })) })),
      update: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
    };
  });

  mockRpc.mockResolvedValue({ error: null });
}

function makeRequest(token: string) {
  return new Request(`http://localhost/api/download/${token}`);
}

async function call(token: string) {
  return GET(makeRequest(token), { params: Promise.resolve({ token }) });
}

describe("GET /api/download/[token]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue(true);
    mockGetUrl.mockReturnValue(SIGNED_URL);
    // The route proxies the MP3 to embed ID3 tags; block network by default
    // so tests exercise the redirect fallback unless they opt in.
    global.fetch = jest.fn().mockRejectedValue(new Error("network disabled"));
  });

  it("serves the MP3 with an ID3 tag prepended when the proxy fetch succeeds", async () => {
    setupDb({ trackRow: { ...trackRow, title: "Test Track" } as typeof trackRow });
    const mp3Bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x00]); // bare MPEG frame sync
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(mp3Bytes, {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      }),
    );
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.toString("latin1", 0, 3)).toBe("ID3");
    expect(body.subarray(body.length - 4)).toEqual(Buffer.from(mp3Bytes));
  });

  it("falls back to a 302 redirect when the proxy fetch fails", async () => {
    setupDb();
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(SIGNED_URL);
  });

  it("returns 403 for an expired token", async () => {
    setupDb({ tokenRow: { ...tokenRow, expires_at: past } });
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(403);
  });

  it("returns 403 for a already-used token", async () => {
    setupDb({ tokenRow: { ...tokenRow, is_used: true } });
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(403);
  });

  it("returns 403 for an unknown token", async () => {
    setupDb({ tokenRow: null });
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(403);
  });

  it("returns 403 for a token shorter than 32 chars", async () => {
    setupDb();
    const res = await call("short");
    expect(res.status).toBe(403);
  });

  it("returns 403 when the order is not completed", async () => {
    setupDb({ orderRow: { ...orderRow, status: "pending" } });
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(403);
  });

  it("returns 403 when the track has no audio ID", async () => {
    setupDb({ trackRow: { id: "trk-1", public_audio_id: null } });
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(403);
  });

  it("returns 403 when rate limited", async () => {
    mockRateLimit.mockResolvedValue(false);
    setupDb();
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(403);
  });

  it("returns 403 when Cloudinary URL generation fails", async () => {
    setupDb();
    mockGetUrl.mockReturnValue(null);
    const res = await call(VALID_TOKEN);
    expect(res.status).toBe(403);
  });
});
