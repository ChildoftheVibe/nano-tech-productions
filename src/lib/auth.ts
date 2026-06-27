import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./db/admin";

export const ADMIN_COOKIE = "ntv_admin_session";
const CSRF_COOKIE = "ntv-csrf";
const SESSION_HOURS = 8;

function extractIp(h: { get: (k: string) => string | null }): string {
  const cfIp = h.get("cf-connecting-ip") ?? h.get("x-client-ip");
  if (cfIp) return cfIp;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

function adminPasswordHash(): string | null {
  const h = process.env.ADMIN_PASSWORD_HASH?.trim();
  return h && h.length > 0 ? h : null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(input: string): Promise<boolean> {
  const stored = adminPasswordHash();
  if (!stored) return false;
  try {
    return await bcrypt.compare(input, stored);
  } catch {
    return false;
  }
}

export async function createSession(ipAddress?: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from("admin_sessions").insert({
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ipAddress ?? null,
  });
  if (error) throw new Error(`session_create_failed: ${error.message}`);
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await supabaseAdmin
    .from("admin_sessions")
    .update({ is_revoked: true })
    .eq("token_hash", tokenHash);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const h = await headers();
  return verifySessionToken(token, extractIp(h));
}

export async function verifySessionToken(token: string, currentIp?: string): Promise<boolean> {
  if (!token) return false;
  const tokenHash = hashToken(token);
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("id, expires_at, is_revoked, ip_address")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return false;
  if (data.is_revoked) return false;
  if (new Date(data.expires_at).getTime() <= Date.now()) return false;
  // IP binding: if both the stored IP and current IP are known and differ, invalidate.
  const storedIp = data.ip_address as string | null;
  if (currentIp && currentIp !== "unknown" && storedIp && storedIp !== "unknown" && storedIp !== currentIp) {
    return false;
  }
  return true;
}

export async function setAdminCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function readSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value ?? null;
}

export async function requireAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

// CSRF double-submit cookie — call from login/webauthn-verify after auth succeeds.
// Cookie is httpOnly:false so client JS can read it and echo it as x-csrf-token.
export async function setCsrfCookie(): Promise<void> {
  const jar = await cookies();
  const token = randomBytes(32).toString("hex");
  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

// Validates that the x-csrf-token header matches the ntv-csrf cookie.
// Use on every admin POST/PATCH/DELETE route after requireAdmin().
export async function validateCsrf(requestHeaders: Headers): Promise<boolean> {
  const headerToken = requestHeaders.get("x-csrf-token");
  if (!headerToken) return false;
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;
  try {
    const a = Buffer.from(headerToken);
    const b = Buffer.from(cookieToken);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
